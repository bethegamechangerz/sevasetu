import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditLog, bookings } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { simulateUpiSettle } from "@/lib/payments/upi";

export const runtime = "nodejs";

const SettleSchema = z.object({ upiTxnRef: z.string().min(1).max(64) }).strict();

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

  const parsed = SettleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid request", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const result = simulateUpiSettle(parsed.data.upiTxnRef);

  if (result.status === "SUCCESS") {
    const booking = await db.query.bookings.findFirst({ where: eq(bookings.upiTxnRef, parsed.data.upiTxnRef) });
    if (booking) {
      await db.transaction(async (tx) => {
        await tx
          .update(bookings)
          .set({ paymentStatus: "paid", updatedAt: new Date() })
          .where(eq(bookings.upiTxnRef, parsed.data.upiTxnRef));
        await tx.insert(auditLog).values({
          actorId: user.id,
          action: "UPI_SETTLED",
          entity: "bookings",
          entityId: booking.id,
          metadata: JSON.stringify({ upiTxnRef: parsed.data.upiTxnRef }),
        });
      });
    }
  } else {
    const booking = await db.query.bookings.findFirst({ where: eq(bookings.upiTxnRef, parsed.data.upiTxnRef) });
    if (booking) {
      await db
        .update(bookings)
        .set({ paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(bookings.upiTxnRef, parsed.data.upiTxnRef));
    }
  }

  return NextResponse.json(result);
}
