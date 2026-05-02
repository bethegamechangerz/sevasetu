import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditLog, bookings, providers } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";

export const runtime = "nodejs";

const PatchSchema = z
  .object({
    status: z.enum(["pending", "accepted", "in_progress", "completed", "cancelled", "no_show"]).optional(),
    cancelledReason: z.string().max(500).optional(),
  })
  .strict();

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }
  const { id } = await ctx.params;
  const row = await db.query.bookings.findFirst({ where: eq(bookings.id, id) });
  if (!row) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Booking not found" } }, { status: 404 });
  }
  if (row.userId !== user.id && row.providerId !== user.id) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not a participant" } }, { status: 403 });
  }
  return NextResponse.json({ booking: row });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Invalid JSON body" } }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid update", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  if (!parsed.data.status) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "status is required" } }, { status: 400 });
  }

  const existing = await db.query.bookings.findFirst({ where: eq(bookings.id, id) });
  if (!existing) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Booking not found" } }, { status: 404 });
  }
  if (existing.userId !== user.id && existing.providerId !== user.id) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not a participant" } }, { status: 403 });
  }

  const next = parsed.data.status;
  const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(next)) {
    return NextResponse.json(
      { error: { code: "INVALID_TRANSITION", message: `Cannot move ${existing.status} -> ${next}` } },
      { status: 409 },
    );
  }

  const isProvider = existing.providerId === user.id;
  const isCustomer = existing.userId === user.id;
  if ((next === "accepted" || next === "in_progress" || next === "completed" || next === "no_show") && !isProvider) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Only the provider can do this transition" } },
      { status: 403 },
    );
  }
  if (next === "cancelled" && !isProvider && !isCustomer) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not a participant" } }, { status: 403 });
  }

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(bookings)
      .set({
        status: next,
        cancelledReason: next === "cancelled" ? parsed.data.cancelledReason ?? null : existing.cancelledReason,
        completedAt: next === "completed" ? new Date() : existing.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();

    if (next === "completed") {
      await tx
        .update(providers)
        .set({ completedBookings: sql`${providers.completedBookings} + 1`, updatedAt: new Date() })
        .where(eq(providers.userId, existing.providerId));
    }

    await tx.insert(auditLog).values({
      actorId: user.id,
      action: "BOOKING_TRANSITION",
      entity: "bookings",
      entityId: id,
      metadata: JSON.stringify({ from: existing.status, to: next }),
    });

    return row;
  });

  return NextResponse.json({ booking: updated });
}
