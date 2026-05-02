import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, providers, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { BookingSchema } from "@/lib/validators";
import { buildUpiIntent, simulateUpiCollect } from "@/lib/payments/upi";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }
  const url = new URL(req.url);
  const role = url.searchParams.get("role") === "provider" ? "provider" : "customer";

  const where = role === "provider" ? eq(bookings.providerId, user.id) : eq(bookings.userId, user.id);
  const counterpartyJoin = role === "provider" ? bookings.userId : bookings.providerId;
  const rows = await db
    .select({
      booking: bookings,
      counterparty: { id: users.id, name: users.name, image: users.image },
    })
    .from(bookings)
    .innerJoin(users, eq(users.id, counterpartyJoin))
    .where(where)
    .orderBy(desc(bookings.createdAt));

  return NextResponse.json({ items: rows, role });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Invalid JSON body" } }, { status: 400 });
  }

  const parsed = BookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid booking", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.providerId === user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Cannot book yourself" } },
      { status: 403 },
    );
  }

  const provRow = await db
    .select({ provider: providers, user: { name: users.name } })
    .from(providers)
    .innerJoin(users, eq(users.id, providers.userId))
    .where(eq(providers.userId, data.providerId))
    .limit(1);
  const found = provRow[0];
  if (!found) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Provider not found" } }, { status: 404 });
  }
  if (!found.provider.isAcceptingBookings) {
    return NextResponse.json(
      { error: { code: "PROVIDER_UNAVAILABLE", message: "Provider is not accepting bookings" } },
      { status: 409 },
    );
  }

  let upiTxnRef: string | null = null;
  let upiIntent: string | null = null;
  if (found.provider.upiVpa && data.priceQuoted > 0) {
    try {
      const collect = simulateUpiCollect({ payeeVpa: found.provider.upiVpa, amountInr: data.priceQuoted });
      upiTxnRef = collect.upiTxnRef;
      upiIntent = buildUpiIntent({
        payeeVpa: found.provider.upiVpa,
        payeeName: found.user.name,
        amountInr: data.priceQuoted,
        txnRef: collect.upiTxnRef,
        note: "SevaSetu booking",
      });
    } catch {
      upiTxnRef = null;
      upiIntent = null;
    }
  }

  const [row] = await db
    .insert(bookings)
    .values({
      userId: user.id,
      providerId: data.providerId,
      serviceId: data.serviceId,
      scheduledAt: data.scheduledAt,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      notes: data.notes,
      priceQuoted: data.priceQuoted,
      status: "pending",
      paymentStatus: upiTxnRef ? "initiated" : "unpaid",
      upiTxnRef,
    })
    .returning();

  return NextResponse.json({ booking: row, upiIntent }, { status: 201 });
}
