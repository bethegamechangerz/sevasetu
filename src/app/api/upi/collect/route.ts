import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { providers, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { buildUpiIntent, simulateUpiCollect } from "@/lib/payments/upi";

export const runtime = "nodejs";

const CollectSchema = z
  .object({
    providerId: z.string().min(1),
    amountInr: z.coerce.number().int().min(1).max(1_000_000),
  })
  .strict();

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

  const parsed = CollectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid request", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const found = await db
    .select({ provider: providers, user: { name: users.name } })
    .from(providers)
    .innerJoin(users, eq(users.id, providers.userId))
    .where(eq(providers.userId, parsed.data.providerId))
    .limit(1);

  const row = found[0];
  if (!row) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Provider not found" } }, { status: 404 });
  }
  if (!row.provider.upiVpa) {
    return NextResponse.json(
      { error: { code: "UPI_NOT_CONFIGURED", message: "Provider has no UPI VPA configured" } },
      { status: 409 },
    );
  }

  try {
    const collect = simulateUpiCollect({ payeeVpa: row.provider.upiVpa, amountInr: parsed.data.amountInr });
    const intentUrl = buildUpiIntent({
      payeeVpa: row.provider.upiVpa,
      payeeName: row.user.name,
      amountInr: parsed.data.amountInr,
      txnRef: collect.upiTxnRef,
      note: "SevaSetu",
    });
    return NextResponse.json({ upiTxnRef: collect.upiTxnRef, intentUrl, collect });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UPI collect failed";
    return NextResponse.json({ error: { code: "UPI_ERROR", message: msg } }, { status: 400 });
  }
}
