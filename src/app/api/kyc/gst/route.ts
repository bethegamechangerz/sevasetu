import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditLog, providers } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { isValidGstinChecksum, isValidGstinFormat, simulateVerifyGstin } from "@/lib/kyc/gst";

export const runtime = "nodejs";

const GstSchema = z
  .object({
    gstin: z
      .string()
      .transform((s) => s.toUpperCase().trim())
      .refine((g) => isValidGstinFormat(g) && isValidGstinChecksum(g), {
        message: "Invalid GSTIN format or checksum",
      }),
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

  const parsed = GstSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid GSTIN", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const provider = await db.query.providers.findFirst({ where: eq(providers.userId, user.id) });
  if (!provider) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No provider profile" } }, { status: 404 });
  }

  const result = simulateVerifyGstin(parsed.data.gstin);

  await db.transaction(async (tx) => {
    await tx
      .update(providers)
      .set({
        gstin: result.gstin,
        gstinStatus: result.status === "VALID" ? "verified" : "failed",
        updatedAt: new Date(),
      })
      .where(eq(providers.userId, user.id));

    await tx.insert(auditLog).values({
      actorId: user.id,
      action: result.status === "VALID" ? "GST_VERIFIED" : "GST_VERIFY_FAILED",
      entity: "providers",
      entityId: user.id,
      metadata: JSON.stringify({ gstin: result.gstin.slice(0, 2) + "XXXXXXXXXXXX" + result.gstin.slice(-1), state: result.state }),
    });
  });

  return NextResponse.json(result);
}
