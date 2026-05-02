import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { providerCategories, providers, reviews, services, users } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Missing id" } }, { status: 400 });
  }

  const row = await db
    .select({
      provider: providers,
      user: { id: users.id, name: users.name, image: users.image, phoneVerified: users.phoneVerified },
    })
    .from(providers)
    .innerJoin(users, eq(users.id, providers.userId))
    .where(eq(providers.userId, id))
    .limit(1);

  const found = row[0];
  if (!found) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Provider not found" } }, { status: 404 });
  }

  const [cats, svcs, topReviews] = await Promise.all([
    db
      .select({ categorySlug: providerCategories.categorySlug })
      .from(providerCategories)
      .where(eq(providerCategories.providerId, id)),
    db
      .select()
      .from(services)
      .where(and(eq(services.providerId, id), eq(services.isActive, true)))
      .orderBy(desc(services.createdAt)),
    db
      .select({
        review: reviews,
        reviewer: { id: users.id, name: users.name, image: users.image },
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.reviewerId))
      .where(eq(reviews.providerId, id))
      .orderBy(desc(reviews.likeCount), desc(reviews.createdAt))
      .limit(5),
  ]);

  return NextResponse.json({
    provider: found.provider,
    user: found.user,
    categories: cats.map((c) => c.categorySlug),
    services: svcs,
    reviews: topReviews,
  });
}
