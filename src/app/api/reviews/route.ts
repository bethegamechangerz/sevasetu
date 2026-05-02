import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, providers, reviews } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { ReviewSchema } from "@/lib/validators";

export const runtime = "nodejs";

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

  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid review", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.providerId === user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Cannot review yourself" } },
      { status: 403 },
    );
  }

  const completed = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.userId, user.id),
        eq(bookings.providerId, data.providerId),
        eq(bookings.status, "completed"),
      ),
    )
    .limit(1);
  if (completed.length === 0) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "You can only review providers after a completed booking" } },
      { status: 403 },
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(reviews)
        .values({
          providerId: data.providerId,
          reviewerId: user.id,
          bookingId: completed[0]?.id ?? null,
          rating: data.rating,
          comment: data.comment,
        })
        .returning();

      const agg = await tx
        .select({
          avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::real`,
          count: sql<number>`count(*)::int`,
        })
        .from(reviews)
        .where(eq(reviews.providerId, data.providerId));

      const avg = agg[0]?.avg ?? 0;
      const count = agg[0]?.count ?? 0;

      await tx
        .update(providers)
        .set({ ratingAvg: avg, ratingCount: count, updatedAt: new Date() })
        .where(eq(providers.userId, data.providerId));

      return row;
    });

    return NextResponse.json({ review: result }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate key|unique/i.test(msg)) {
      return NextResponse.json(
        { error: { code: "ALREADY_REVIEWED", message: "You have already reviewed this provider" } },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Failed to create review" } },
      { status: 500 },
    );
  }
}
