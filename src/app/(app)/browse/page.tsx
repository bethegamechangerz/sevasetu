import Link from "next/link";
import { ArrowLeft, ArrowRight, MapPinOff, SearchX } from "lucide-react";

import { BrowseShell } from "@/components/browse-shell";
import { FilterBar } from "@/components/filter-bar";
import { DynamicMap, type DynamicMapProps } from "@/components/map/dynamic-map";
import { ProviderCard, type ProviderCardData } from "@/components/provider-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { db } from "@/lib/db";
import { providerCategories, providers, users } from "@/lib/db/schema";
import { publicEnv } from "@/lib/env";
import { bboxAround, haversineKm } from "@/lib/geo";
import { SearchSchema } from "@/lib/validators";
import { cn, formatNumber } from "@/lib/utils";

import { and, count, desc, eq, gte, ilike, inArray, lte, or, type SQL } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RawSearchParams = Record<string, string | string[] | undefined>;

function flatten(sp: RawSearchParams): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) out[k] = v[0];
    else out[k] = v;
  }
  return out;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = await searchParams;
  const parsed = SearchSchema.safeParse(flatten(sp));
  const filters = parsed.success ? parsed.data : SearchSchema.parse({});

  const lat = filters.lat ?? publicEnv.NEXT_PUBLIC_DEFAULT_LAT;
  const lng = filters.lng ?? publicEnv.NEXT_PUBLIC_DEFAULT_LNG;
  const radiusKm = filters.radiusKm;
  const bbox = bboxAround(lat, lng, radiusKm);
  const center = { lat, lng };

  const conditions: SQL[] = [
    eq(providers.isAcceptingBookings, true),
    gte(providers.lat, bbox.minLat),
    lte(providers.lat, bbox.maxLat),
    gte(providers.lng, bbox.minLng),
    lte(providers.lng, bbox.maxLng),
  ];

  if (filters.minRating !== undefined) {
    conditions.push(gte(providers.ratingAvg, filters.minRating));
  }

  if (filters.online === true) {
    conditions.push(eq(providers.isOnline, true));
  } else if (filters.online === false) {
    conditions.push(eq(providers.isOnline, false));
  }

  if (typeof filters.maxPrice === "number" && filters.maxPrice > 0) {
    conditions.push(lte(providers.hourlyRateMin, filters.maxPrice));
  }

  if (filters.q && filters.q.trim().length > 0) {
    const needle = `%${filters.q.trim().replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const term = or(
      ilike(providers.headline, needle),
      ilike(providers.bio, needle),
      ilike(providers.city, needle),
    );
    if (term) conditions.push(term);
  }

  if (filters.category) {
    const sub = db
      .select({ providerId: providerCategories.providerId })
      .from(providerCategories)
      .where(eq(providerCategories.categorySlug, filters.category));
    conditions.push(inArray(providers.userId, sub));
  }

  const where = and(...conditions);
  const offset = (filters.page - 1) * filters.pageSize;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        userId: providers.userId,
        headline: providers.headline,
        city: providers.city,
        state: providers.state,
        lat: providers.lat,
        lng: providers.lng,
        hourlyRateMin: providers.hourlyRateMin,
        hourlyRateMax: providers.hourlyRateMax,
        ratingAvg: providers.ratingAvg,
        ratingCount: providers.ratingCount,
        completedBookings: providers.completedBookings,
        isOnline: providers.isOnline,
        aadhaarStatus: providers.aadhaarStatus,
        ondcParticipantId: providers.ondcParticipantId,
        userName: users.name,
        userImage: users.image,
      })
      .from(providers)
      .innerJoin(users, eq(users.id, providers.userId))
      .where(where)
      .orderBy(desc(providers.ratingAvg), desc(providers.completedBookings))
      .limit(filters.pageSize)
      .offset(offset),
    db.select({ value: count() }).from(providers).where(where),
  ]);

  const total = totalRow[0]?.value ?? 0;

  const ids = rows.map((r) => r.userId);
  const catRows = ids.length
    ? await db
        .select({ providerId: providerCategories.providerId, slug: providerCategories.categorySlug })
        .from(providerCategories)
        .where(inArray(providerCategories.providerId, ids))
    : [];

  const catsByProvider = new Map<string, string[]>();
  for (const r of catRows) {
    const arr = catsByProvider.get(r.providerId) ?? [];
    arr.push(r.slug);
    catsByProvider.set(r.providerId, arr);
  }

  const enriched = rows.map((r) => {
    const distanceKm = haversineKm(center, { lat: r.lat, lng: r.lng });
    const data: ProviderCardData = {
      user: { id: r.userId, name: r.userName, image: r.userImage ?? null },
      provider: {
        userId: r.userId,
        headline: r.headline,
        city: r.city,
        state: r.state,
        hourlyRateMin: r.hourlyRateMin,
        hourlyRateMax: r.hourlyRateMax,
        ratingAvg: r.ratingAvg,
        ratingCount: r.ratingCount,
        isOnline: r.isOnline,
        aadhaarStatus: r.aadhaarStatus,
        ondcParticipantId: r.ondcParticipantId,
      },
      categories: catsByProvider.get(r.userId) ?? [],
    };
    return { ...r, distanceKm, data };
  });

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const page = Math.min(filters.page, totalPages);
  const heading = filters.category ? getCategory(filters.category)?.nameEn ?? "Providers" : "All providers";

  const list = (
    <ResultsList
      heading={heading}
      total={total}
      page={page}
      totalPages={totalPages}
      hasFilters={Boolean(filters.q || filters.category || filters.minRating || filters.maxPrice || filters.online)}
      currentParams={sp}
    >
      {enriched.length === 0 ? (
        <EmptyState hasFilters={Boolean(filters.q || filters.category)} />
      ) : (
        <ul role="list" className="space-y-3">
          {enriched.map((r) => {
            const primary = (catsByProvider.get(r.userId) ?? [])[0];
            return (
              <li key={r.userId}>
                <ProviderCard
                  data={r.data}
                  distanceKm={r.distanceKm}
                  primaryCategory={primary}
                />
              </li>
            );
          })}
        </ul>
      )}
    </ResultsList>
  );

  const mapMarkers: DynamicMapProps["markers"] = enriched.map((r) => ({
    id: r.userId,
    lat: r.lat,
    lng: r.lng,
    name: r.userName,
    ratingAvg: r.ratingAvg,
    ratingCount: r.ratingCount,
    headline: r.headline,
    href: `/providers/${r.userId}`,
  }));

  const map = <DynamicMap center={center} markers={mapMarkers} height="100%" />;

  return (
    <div className="min-h-screen bg-background">
      <FilterBar />
      <BrowseShell list={list} map={map} resultCount={total} />
    </div>
  );
}

function ResultsList({
  heading,
  total,
  page,
  totalPages,
  hasFilters,
  currentParams,
  children,
}: {
  heading: string;
  total: number;
  page: number;
  totalPages: number;
  hasFilters: boolean;
  currentParams: RawSearchParams;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{heading}</h1>
          <p className="text-xs text-muted-foreground">
            {total === 0
              ? "No providers found"
              : `${formatNumber(total)} ${total === 1 ? "provider" : "providers"} ${hasFilters ? "matched" : "nearby"}`}
          </p>
        </div>
      </header>
      {children}
      <Pagination page={page} totalPages={totalPages} currentParams={currentParams} />
    </div>
  );
}

function buildPageHref(currentParams: RawSearchParams, nextPage: number): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(currentParams)) {
    if (v === undefined) continue;
    if (k === "page") continue;
    if (Array.isArray(v)) {
      const first = v[0];
      if (first) params.set(k, first);
    } else {
      params.set(k, v);
    }
  }
  if (nextPage > 1) params.set("page", String(nextPage));
  const qs = params.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

function Pagination({
  page,
  totalPages,
  currentParams,
}: {
  page: number;
  totalPages: number;
  currentParams: RawSearchParams;
}) {
  if (totalPages <= 1) return null;
  const prevHref = buildPageHref(currentParams, Math.max(1, page - 1));
  const nextHref = buildPageHref(currentParams, Math.min(totalPages, page + 1));
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      className="mt-2 flex items-center justify-between border-t pt-3 text-sm"
    >
      <Button
        asChild={!atStart}
        variant="outline"
        size="sm"
        disabled={atStart}
        className={cn("gap-1.5", atStart && "pointer-events-none opacity-50")}
      >
        {atStart ? (
          <span>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </span>
        ) : (
          <Link href={prevHref} prefetch={false} aria-label="Previous page">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </Link>
        )}
      </Button>
      <span className="text-xs text-muted-foreground" aria-live="polite">
        Page <span className="font-medium text-foreground tabular-nums">{page}</span> of{" "}
        <span className="tabular-nums">{totalPages}</span>
      </span>
      <Button
        asChild={!atEnd}
        variant="outline"
        size="sm"
        disabled={atEnd}
        className={cn("gap-1.5", atEnd && "pointer-events-none opacity-50")}
      >
        {atEnd ? (
          <span>
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          <Link href={nextHref} prefetch={false} aria-label="Next page">
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </Button>
    </nav>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const Icon = hasFilters ? SearchX : MapPinOff;
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <div className="rounded-full bg-muted p-3">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {hasFilters ? "No matching providers" : "No providers nearby yet"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {hasFilters
              ? "Try widening your radius, clearing some filters, or removing the search query."
              : "Try expanding your search radius or browsing a popular category below."}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {CATEGORIES.slice(0, 6).map((c) => (
            <Link
              key={c.slug}
              href={`/browse?category=${encodeURIComponent(c.slug)}`}
              className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-accent"
            >
              {c.nameEn}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
