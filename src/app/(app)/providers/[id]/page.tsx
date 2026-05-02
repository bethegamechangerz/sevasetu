import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import {
  BadgeCheck,
  CircleDot,
  IndianRupee,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookNowButton, BookingProvider } from "@/components/booking-cta";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { ReviewForm } from "@/components/review-form";
import { ReviewList, type ReviewListItem } from "@/components/review-list";
import { ShareButton } from "@/components/share-button";
import { StarRating } from "@/components/star-rating";
import { DynamicMap } from "@/components/map/dynamic-map";
import { db } from "@/lib/db";
import {
  bookings as bookingsTbl,
  favorites as favoritesTbl,
  providerCategories,
  providers,
  reviews as reviewsTbl,
  services as servicesTbl,
  users,
} from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { CATEGORY_BY_SLUG } from "@/lib/categories";
import { publicEnv } from "@/lib/env";
import { formatINR, initials, maskPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ id: string }> };

const PRICE_UNIT_LABEL: Record<"per_visit" | "per_hour" | "per_day" | "fixed", string> = {
  per_visit: "per visit",
  per_hour: "per hour",
  per_day: "per day",
  fixed: "fixed",
};

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/-->/g, "--\\u003e");
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const row = await db
    .select({
      name: users.name,
      headline: providers.headline,
      city: providers.city,
      ratingAvg: providers.ratingAvg,
    })
    .from(providers)
    .innerJoin(users, eq(providers.userId, users.id))
    .where(eq(providers.userId, id))
    .limit(1);
  const p = row[0];
  if (!p) return { title: "Provider not found" };
  return {
    title: `${p.name} — ${p.headline} in ${p.city} | ${publicEnv.NEXT_PUBLIC_APP_NAME}`,
    description: `Book ${p.name}, rated ${p.ratingAvg.toFixed(1)} on SevaSetu. ${p.headline}.`,
  };
}

export default async function ProviderProfilePage({ params }: PageProps) {
  const { id } = await params;

  const sessionUser = await getSessionUser();

  const profileRow = await db
    .select({ provider: providers, user: users })
    .from(providers)
    .innerJoin(users, eq(providers.userId, users.id))
    .where(eq(providers.userId, id))
    .limit(1);
  const profile = profileRow[0];
  if (!profile) notFound();

  const { provider, user } = profile;

  const [
    categoryRows,
    serviceRows,
    reviewRows,
    favoriteRow,
    completedBookingRow,
    existingReviewRow,
  ] = await Promise.all([
    db
      .select({ slug: providerCategories.categorySlug })
      .from(providerCategories)
      .where(eq(providerCategories.providerId, provider.userId)),
    db
      .select()
      .from(servicesTbl)
      .where(and(eq(servicesTbl.providerId, provider.userId), eq(servicesTbl.isActive, true))),
    db
      .select({
        id: reviewsTbl.id,
        rating: reviewsTbl.rating,
        comment: reviewsTbl.comment,
        createdAt: reviewsTbl.createdAt,
        reviewerId: reviewsTbl.reviewerId,
        reviewerName: users.name,
        reviewerImage: users.image,
      })
      .from(reviewsTbl)
      .innerJoin(users, eq(reviewsTbl.reviewerId, users.id))
      .where(eq(reviewsTbl.providerId, provider.userId))
      .orderBy(desc(reviewsTbl.createdAt))
      .limit(100),
    sessionUser
      ? db
          .select()
          .from(favoritesTbl)
          .where(
            and(
              eq(favoritesTbl.userId, sessionUser.id),
              eq(favoritesTbl.providerId, provider.userId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    sessionUser
      ? db
          .select({ id: bookingsTbl.id })
          .from(bookingsTbl)
          .where(
            and(
              eq(bookingsTbl.userId, sessionUser.id),
              eq(bookingsTbl.providerId, provider.userId),
              eq(bookingsTbl.status, "completed"),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    sessionUser
      ? db
          .select({ id: reviewsTbl.id })
          .from(reviewsTbl)
          .where(
            and(
              eq(reviewsTbl.providerId, provider.userId),
              eq(reviewsTbl.reviewerId, sessionUser.id),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  const categories = categoryRows
    .map((r) => CATEGORY_BY_SLUG.get(r.slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const reviews: ReviewListItem[] = reviewRows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    reviewerName: r.reviewerName,
    reviewerImage: r.reviewerImage,
  }));

  const isFavorited = favoriteRow.length > 0;
  const hasCompletedBooking = completedBookingRow.length > 0;
  const hasReviewed = existingReviewRow.length > 0;
  const canReview = !!sessionUser && hasCompletedBooking && !hasReviewed;
  const canSeePhone = !!sessionUser && hasCompletedBooking;

  const startingPrice = serviceRows.reduce<number | null>(
    (min, s) => (min === null || s.price < min ? s.price : min),
    null,
  );

  const distribution = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const totalReviews = reviews.length;

  const verified = {
    aadhaar: provider.aadhaarStatus === "verified",
    pan: provider.panStatus === "verified",
    ondc: !!provider.ondcParticipantId,
  };

  const bookingProvider = {
    id: provider.userId,
    name: user.name,
    lat: provider.lat,
    lng: provider.lng,
    hourlyRateMin: provider.hourlyRateMin,
    hourlyRateMax: provider.hourlyRateMax,
    defaultAddress: provider.address,
  };

  const businessId = `${publicEnv.NEXT_PUBLIC_APP_URL}/providers/${provider.userId}#business`;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": businessId,
        name: user.name,
        description: provider.bio,
        ...(user.image ? { image: user.image } : {}),
        url: `${publicEnv.NEXT_PUBLIC_APP_URL}/providers/${provider.userId}`,
        priceRange: `${formatINR(provider.hourlyRateMin)}-${formatINR(provider.hourlyRateMax)}`,
        address: {
          "@type": "PostalAddress",
          streetAddress: provider.address,
          addressLocality: provider.city,
          addressRegion: provider.state,
          postalCode: provider.pincode,
          addressCountry: "IN",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: provider.lat,
          longitude: provider.lng,
        },
        ...(provider.ratingCount > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: provider.ratingAvg,
                reviewCount: provider.ratingCount,
              },
            }
          : {}),
      },
      ...serviceRows.map((s) => ({
        "@type": "Service",
        name: s.title,
        description: s.description,
        provider: { "@id": businessId },
        offers: {
          "@type": "Offer",
          price: s.price,
          priceCurrency: "INR",
        },
        category: CATEGORY_BY_SLUG.get(s.categorySlug)?.nameEn ?? s.categorySlug,
      })),
    ],
  };

  return (
    <BookingProvider provider={bookingProvider} signedIn={!!sessionUser}>
      <script
        type="application/ld+json"
        // JSON-LD escaped so that any '<' or '-->' inside the data cannot terminate the script tag.
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <section className="border-b bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar className="h-24 w-24 ring-2 ring-background shadow-md sm:h-28 sm:w-28">
              {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
              <AvatarFallback className="text-2xl">{initials(user.name)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                    {user.name}
                    {verified.aadhaar ? (
                      <Badge variant="success" title="Aadhaar verified">
                        <BadgeCheck className="mr-1 h-3 w-3" aria-hidden /> Aadhaar
                      </Badge>
                    ) : null}
                    {verified.pan ? (
                      <Badge variant="success" title="PAN verified">
                        <BadgeCheck className="mr-1 h-3 w-3" aria-hidden /> PAN
                      </Badge>
                    ) : null}
                    {verified.ondc ? (
                      <Badge variant="secondary" title="ONDC participant">
                        ONDC
                      </Badge>
                    ) : null}
                  </h1>
                  <p className="text-base text-muted-foreground">{provider.headline}</p>
                </div>

                {sessionUser ? (
                  <FavoriteToggle providerId={provider.userId} initialFavorited={isFavorited} />
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <StarRating value={provider.ratingAvg} size={16} />
                  <span className="font-medium">{provider.ratingAvg.toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    ({provider.ratingCount} review{provider.ratingCount === 1 ? "" : "s"})
                  </span>
                </div>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {provider.city}, {provider.state}
                </div>
                {provider.isOnline ? (
                  <Badge variant="success" className="gap-1">
                    <CircleDot className="h-3 w-3" aria-hidden /> Online now
                  </Badge>
                ) : null}
              </div>

              {categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <Badge key={c.slug} variant="outline">
                      {c.nameEn}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="w-full justify-start gap-1 overflow-x-auto sm:w-auto">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="services">
                  Services {serviceRows.length > 0 ? `(${serviceRows.length})` : null}
                </TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({totalReviews})</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="space-y-4 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">About {user.name.split(" ")[0]}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm leading-relaxed">
                    <p className="whitespace-pre-line">{provider.bio}</p>
                    <Separator />
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <Stat
                        label="Experience"
                        value={`${provider.experienceYears} year${provider.experienceYears === 1 ? "" : "s"}`}
                      />
                      <Stat
                        label="Hourly rate"
                        value={`${formatINR(provider.hourlyRateMin)} – ${formatINR(provider.hourlyRateMax)}`}
                      />
                      {startingPrice !== null ? (
                        <Stat label="Starting from" value={formatINR(startingPrice)} />
                      ) : null}
                      <Stat
                        label="Completed bookings"
                        value={provider.completedBookings.toString()}
                      />
                    </dl>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="services" className="space-y-3 pt-4">
                {serviceRows.length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      <Sparkles className="mx-auto mb-2 h-6 w-6" aria-hidden />
                      No services listed yet. Use Book now for a custom request.
                    </CardContent>
                  </Card>
                ) : (
                  serviceRows.map((s) => {
                    const cat = CATEGORY_BY_SLUG.get(s.categorySlug);
                    return (
                      <Card key={s.id}>
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold">{s.title}</h3>
                              {cat ? (
                                <Badge variant="outline" className="text-[10px]">
                                  {cat.nameEn}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                              {s.description}
                            </p>
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <IndianRupee className="h-3.5 w-3.5" aria-hidden />
                              {formatINR(s.price)}
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                {PRICE_UNIT_LABEL[s.priceUnit]}
                              </span>
                              {s.durationMinutes ? (
                                <span className="text-muted-foreground">
                                  {" "}
                                  • {s.durationMinutes} min
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <BookNowButton
                            size="sm"
                            service={{
                              id: s.id,
                              title: s.title,
                              price: s.price,
                              priceUnit: s.priceUnit,
                            }}
                          >
                            Book this
                          </BookNowButton>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="reviews" className="space-y-4 pt-4">
                <Card>
                  <CardContent className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{provider.ratingAvg.toFixed(1)}</div>
                      <StarRating
                        value={provider.ratingAvg}
                        size={14}
                        className="justify-center"
                      />
                      <div className="text-xs text-muted-foreground">
                        {totalReviews} review{totalReviews === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {distribution
                        .slice()
                        .reverse()
                        .map((d) => {
                          const pct = totalReviews === 0 ? 0 : (d.count / totalReviews) * 100;
                          return (
                            <div key={d.star} className="flex items-center gap-2 text-xs">
                              <span className="w-3 text-right tabular-nums">{d.star}</span>
                              <div
                                className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                                role="progressbar"
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${d.star} star reviews: ${d.count}`}
                              >
                                <div
                                  className="h-full rounded-full bg-amber-400"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-8 text-right tabular-nums text-muted-foreground">
                                {d.count}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>

                {canReview ? <ReviewForm providerId={provider.userId} /> : null}
                {sessionUser && hasReviewed ? (
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    You have already reviewed this provider. Thanks for sharing.
                  </p>
                ) : null}
                {sessionUser && !hasCompletedBooking && !hasReviewed ? (
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Reviews are open after a completed booking with this provider.
                  </p>
                ) : null}

                <ReviewList reviews={reviews} />
              </TabsContent>

              <TabsContent value="location" className="space-y-3 pt-4">
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin
                        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <div>
                        <div className="font-medium">{provider.address}</div>
                        <div className="text-muted-foreground">
                          {provider.city}, {provider.state} {provider.pincode}
                        </div>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-md border">
                      <DynamicMap
                        center={{ lat: provider.lat, lng: provider.lng }}
                        markers={[
                          {
                            id: provider.userId,
                            lat: provider.lat,
                            lng: provider.lng,
                            name: user.name,
                            ratingAvg: provider.ratingAvg,
                            ratingCount: provider.ratingCount,
                            headline: provider.headline,
                            href: `/providers/${provider.userId}`,
                          },
                        ]}
                        height={280}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <aside className="md:col-span-1">
            <div className="sticky top-20 space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-baseline gap-2 text-base">
                    From {formatINR(provider.hourlyRateMin)}
                    <span className="text-xs font-normal text-muted-foreground">/ hour</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <BookNowButton size="lg" className="w-full">
                    Book now
                  </BookNowButton>

                  {provider.upiVpa ? (
                    <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between gap-2">
                        <span>Pay via UPI on completion</span>
                      </div>
                      <div className="font-mono text-[11px] text-foreground/80">
                        {provider.upiVpa}
                      </div>
                    </div>
                  ) : null}

                  {user.phone ? (
                    canSeePhone ? (
                      <a
                        href={`tel:${user.phone}`}
                        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
                      >
                        <Phone className="h-4 w-4" aria-hidden />
                        <span className="font-medium">{maskPhone(user.phone)}</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        <Phone className="h-4 w-4" aria-hidden />
                        Phone available after a completed booking
                      </div>
                    )
                  ) : null}

                  <div className="flex items-center gap-2">
                    <ShareButton title={`${user.name} on SevaSetu`} text={provider.headline} />
                    {!sessionUser ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/login?next=/providers/${provider.userId}`}>
                          Sign in to book
                        </Link>
                      </Button>
                    ) : null}
                  </div>

                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Direct UPI payment to the provider. SevaSetu does not hold funds. Pricing is
                    confirmed by the provider before work starts.
                  </p>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </section>
    </BookingProvider>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
