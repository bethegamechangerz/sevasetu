import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { ServiceSchema } from "@/lib/validators";

export const runtime = "nodejs";

const ServiceUpdateSchema = ServiceSchema.partial().extend({
  isActive: z.coerce.boolean().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = await db.query.services.findFirst({ where: eq(services.id, id) });
  if (!row) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Service not found" } }, { status: 404 });
  }
  return NextResponse.json({ service: row });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }
  const { id } = await ctx.params;

  const existing = await db.query.services.findFirst({ where: eq(services.id, id) });
  if (!existing) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Service not found" } }, { status: 404 });
  }
  if (existing.providerId !== user.id) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not your service" } }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Invalid JSON body" } }, { status: 400 });
  }

  const parsed = ServiceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid update", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const [row] = await db
    .update(services)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(services.id, id), eq(services.providerId, user.id)))
    .returning();

  return NextResponse.json({ service: row });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }
  const { id } = await ctx.params;

  const existing = await db.query.services.findFirst({ where: eq(services.id, id) });
  if (!existing) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Service not found" } }, { status: 404 });
  }
  if (existing.providerId !== user.id) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not your service" } }, { status: 403 });
  }

  await db.delete(services).where(and(eq(services.id, id), eq(services.providerId, user.id)));
  return NextResponse.json({ ok: true });
}
