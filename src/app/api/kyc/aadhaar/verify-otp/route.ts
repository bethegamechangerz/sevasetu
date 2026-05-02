import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, providers } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { AadhaarVerifyOtpSchema } from "@/lib/validators";
import { hashAadhaar, lastFour, simulateVerifyAadhaarOtp } from "@/lib/kyc/aadhaar";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }

  if (process.env.AADHAAR_MODE === "disabled") {
    return NextResponse.json(
      { error: { code: "AADHAAR_DISABLED", message: "Aadhaar verification is disabled" } },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Invalid JSON body" } }, { status: 400 });
  }

  const parsed = AadhaarVerifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid request", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const provider = await db.query.providers.findFirst({ where: eq(providers.userId, user.id) });
  if (!provider) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No provider profile" } }, { status: 404 });
  }

  const result = simulateVerifyAadhaarOtp(parsed.data.txnId, parsed.data.otp, parsed.data.aadhaar);

  if (!result.verified) {
    await db.insert(auditLog).values({
      actorId: user.id,
      action: "AADHAAR_VERIFY_FAILED",
      entity: "providers",
      entityId: user.id,
      metadata: JSON.stringify({ reason: result.reason }),
    });
    return NextResponse.json(
      { error: { code: "AADHAAR_VERIFY_FAILED", message: result.reason ?? "Verification failed" } },
      { status: 400 },
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(providers)
      .set({
        aadhaarLast4: lastFour(parsed.data.aadhaar),
        aadhaarHash: hashAadhaar(parsed.data.aadhaar),
        aadhaarStatus: "verified",
        aadhaarVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(providers.userId, user.id));

    await tx.insert(auditLog).values({
      actorId: user.id,
      action: "AADHAAR_VERIFIED",
      entity: "providers",
      entityId: user.id,
      metadata: JSON.stringify({ last4: lastFour(parsed.data.aadhaar), refId: result.ekyc?.refId }),
    });
  });

  return NextResponse.json({ verified: true, ekyc: result.ekyc });
}
