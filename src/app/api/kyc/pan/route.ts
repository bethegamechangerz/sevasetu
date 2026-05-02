import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditLog, providers } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { isValidPanFormat, simulateVerifyPan } from "@/lib/kyc/pan";

export const runtime = "nodejs";

const PanSchema = z
  .object({
    pan: z
      .string()
      .transform((s) => s.toUpperCase().trim())
      .refine(isValidPanFormat, { message: "Invalid PAN format" }),
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

  const parsed = PanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid PAN", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const provider = await db.query.providers.findFirst({ where: eq(providers.userId, user.id) });
  if (!provider) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No provider profile" } }, { status: 404 });
  }

  const result = simulateVerifyPan(parsed.data.pan);

  await db.transaction(async (tx) => {
    await tx
      .update(providers)
      .set({
        panNumber: result.pan,
        panStatus: result.status === "VALID" ? "verified" : "failed",
        updatedAt: new Date(),
      })
      .where(eq(providers.userId, user.id));

    await tx.insert(auditLog).values({
      actorId: user.id,
      action: result.status === "VALID" ? "PAN_VERIFIED" : "PAN_VERIFY_FAILED",
      entity: "providers",
      entityId: user.id,
      metadata: JSON.stringify({ pan: result.pan.slice(0, 5) + "XXXXX", entity: result.entityType }),
    });
  });

  return NextResponse.json(result);
}
