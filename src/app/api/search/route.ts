import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { providers, providerCategories, services, users } from "@/lib/db/schema";
import { SearchSchema } from "@/lib/validators";
import { bboxAround, haversineKm } from "@/lib/geo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = SearchSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid search parameters", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  const params = parsed.data;
  const { page, pageSize } = params;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(providers.isAcceptingBookings, true)];

  if (typeof params.lat === "number" && typeof params.lng === "number") {
    const box = bboxAround(params.lat, params.lng, params.radiusKm);
    conditions.push(gte(providers.lat, box.minLat));
    conditions.push(lte(providers.lat, box.maxLat));
    conditions.push(gte(providers.lng, box.minLng));
    conditions.push(lte(providers.lng, box.maxLng));
  }
  if (typeof params.minRating === "number") {
    conditions.push(gte(providers.ratingAvg, params.minRating));
  }
  if (typeof params.online === "boolean") {
    conditions.push(eq(providers.isOnline, params.online));
  }
  if (params.q) {
    const like = `%${params.q}%`;
    const textCond = or(
      ilike(providers.headline, like),
      ilike(providers.bio, like),
      ilike(providers.city, like),
      ilike(users.name, like),
    );
    if (textCond) conditions.push(textCond);
  }

  const baseQuery = db
    .select({
      providerId: providers.userId,
      name: users.name,
      image: users.image,
      headline: providers.headline,
      bio: providers.bio,
      city: providers.city,
      state: providers.state,
      pincode: providers.pincode,
      lat: providers.lat,
      lng: providers.lng,
      hourlyRateMin: providers.hourlyRateMin,
      hourlyRateMax: providers.hourlyRateMax,
      ratingAvg: providers.ratingAvg,
      ratingCount: providers.ratingCount,
      completedBookings: providers.completedBookings,
      isOnline: providers.isOnline,
      experienceYears: providers.experienceYears,
    })
    .from(providers)
    .innerJoin(users, eq(users.id, providers.userId));

  const filtered = params.category
    ? baseQuery.innerJoin(
        providerCategories,
        and(eq(providerCategories.providerId, providers.userId), eq(providerCategories.categorySlug, params.category)),
      )
    : baseQuery;

  const where = and(...conditions);
  const rows = await filtered
    .where(where)
    .orderBy(desc(providers.ratingAvg), desc(providers.completedBookings))
    .limit(pageSize)
    .offset(offset);

  const totalRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(providers)
    .innerJoin(users, eq(users.id, providers.userId))
    .where(where);
  const total = totalRow[0]?.count ?? 0;

  let priceFilteredIds: Set<string> | null = null;
  if (typeof params.maxPrice === "number" && rows.length > 0) {
    const ids = rows.map((r) => r.providerId);
    const cheapest = await db
      .select({ providerId: services.providerId, minPrice: sql<number>`min(${services.price})::int` })
      .from(services)
      .where(and(eq(services.isActive, true), sql`${services.providerId} = ANY(${ids})`))
      .groupBy(services.providerId);
    const priceMap = new Map(cheapest.map((c) => [c.providerId, c.minPrice]));
    priceFilteredIds = new Set(
      rows
        .filter((r) => {
          const min = priceMap.get(r.providerId);
          if (min === undefined) return r.hourlyRateMin <= params.maxPrice!;
          return Math.min(min, r.hourlyRateMin) <= params.maxPrice!;
        })
        .map((r) => r.providerId),
    );
  }

  const items = rows
    .filter((r) => (priceFilteredIds ? priceFilteredIds.has(r.providerId) : true))
    .map((r) => {
      const distanceKm =
        typeof params.lat === "number" && typeof params.lng === "number"
          ? haversineKm({ lat: params.lat, lng: params.lng }, { lat: r.lat, lng: r.lng })
          : null;
      return { ...r, distanceKm };
    });

  return NextResponse.json({ items, total, page, pageSize });
}
