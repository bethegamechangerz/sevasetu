import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { providers } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { PincodeSchema } from "@/lib/validators";

export const runtime = "nodejs";

const ProviderUpdateSchema = z
  .object({
    headline: z.string().min(5).max(120).optional(),
    bio: z.string().min(20).max(2000).optional(),
    hourlyRateMin: z.coerce.number().int().min(50).max(100000).optional(),
    hourlyRateMax: z.coerce.number().int().min(50).max(100000).optional(),
    isAcceptingBookings: z.coerce.boolean().optional(),
    address: z.string().min(5).max(300).optional(),
    city: z.string().min(2).max(80).optional(),
    state: z.string().min(2).max(80).optional(),
    pincode: PincodeSchema.optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    upiVpa: z.string().min(5).max(255).optional().or(z.literal("")),
  })
  .strict()
  .refine(
    (d) => {
      if (typeof d.hourlyRateMin === "number" && typeof d.hourlyRateMax === "number") {
        return d.hourlyRateMax >= d.hourlyRateMin;
      }
      return true;
    },
    { message: "Max rate must be at least min rate", path: ["hourlyRateMax"] },
  );

export async function PATCH(req: Request) {
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

  const parsed = ProviderUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid update", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const existing = await db.query.providers.findFirst({ where: eq(providers.userId, user.id) });
  if (!existing) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No provider profile" } }, { status: 404 });
  }

  const update = { ...parsed.data, updatedAt: new Date() } as Partial<typeof providers.$inferInsert> & { updatedAt: Date };
  if (update.upiVpa === "") update.upiVpa = null;

  const [row] = await db.update(providers).set(update).where(eq(providers.userId, user.id)).returning();
  return NextResponse.json({ provider: row });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }
  const provider = await db.query.providers.findFirst({ where: eq(providers.userId, user.id) });
  if (!provider) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No provider profile" } }, { status: 404 });
  }
  return NextResponse.json({ provider });
}
