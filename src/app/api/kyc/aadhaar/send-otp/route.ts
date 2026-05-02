import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { AadhaarSendOtpSchema } from "@/lib/validators";
import { simulateSendAadhaarOtp } from "@/lib/kyc/aadhaar";

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

  const parsed = AadhaarSendOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid Aadhaar", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  try {
    const result = simulateSendAadhaarOtp(parsed.data.aadhaar);
    await db.insert(auditLog).values({
      actorId: user.id,
      action: "AADHAAR_OTP_SENT",
      entity: "providers",
      entityId: user.id,
      metadata: JSON.stringify({ txnId: result.txnId, sentTo: result.sentTo }),
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OTP send failed";
    return NextResponse.json(
      { error: { code: "AADHAAR_INVALID", message: msg } },
      { status: 400 },
    );
  }
}
