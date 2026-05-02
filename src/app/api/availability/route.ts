import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { providers } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";

export const runtime = "nodejs";

const AvailabilitySchema = z.object({ isOnline: z.coerce.boolean() }).strict();

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }
  const provider = await db.query.providers.findFirst({ where: eq(providers.userId, user.id) });
  if (!provider) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No provider profile" } }, { status: 404 });
  }
  return NextResponse.json({ isOnline: provider.isOnline });
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

  const parsed = AvailabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid body", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const provider = await db.query.providers.findFirst({ where: eq(providers.userId, user.id) });
  if (!provider) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No provider profile" } }, { status: 404 });
  }

  const [row] = await db
    .update(providers)
    .set({ isOnline: parsed.data.isOnline, updatedAt: new Date() })
    .where(eq(providers.userId, user.id))
    .returning({ isOnline: providers.isOnline });

  return NextResponse.json({ isOnline: row?.isOnline ?? parsed.data.isOnline });
}
