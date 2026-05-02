import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Compass,
  Heart,
  IndianRupee,
  MapPin,
  Sparkles,
} from "lucide-react";

import { ProviderCard } from "@/components/provider-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth-helpers";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { db } from "@/lib/db";
import { bookings, favorites, providerCategories, providers, users } from "@/lib/db/schema";
import { formatINR, initials } from "@/lib/utils";

export const metadata = {
  title: "Dashboard",
  description: "Your bookings, favorites and account at a glance.",
};

type UpcomingBookingRow = {
  id: string;
  scheduledAt: Date;
  address: string;
  status: typeof bookings.$inferSelect.status;
  paymentStatus: typeof bookings.$inferSelect.paymentStatus;
  priceQuoted: number;
  upiTxnRef: string | null;
  providerId: string;
  providerName: string;
  providerImage: string | null;
  providerCity: string;
  providerHeadline: string;
};

function formatScheduled(d: Date, locale: "en" | "hi"): string {
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

const ACTIVE_STATUSES = ["pending", "accepted", "in_progress"] as const;

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "provider") redirect("/provider/dashboard");
  if (user.role === "admin") redirect("/admin");

  const [
    activeRow,
    completedRow,
    spentRow,
    favRow,
    upcoming,
    favProviders,
  ] = await Promise.all([
    db
      .select({ n: count() })
      .from(bookings)
      .where(and(eq(bookings.userId, user.id), inArray(bookings.status, [...ACTIVE_STATUSES]))),
    db
      .select({ n: count() })
      .from(bookings)
      .where(and(eq(bookings.userId, user.id), eq(bookings.status, "completed"))),
    db
      .select({ total: sql<number>`coalesce(sum(${bookings.priceQuoted}), 0)` })
      .from(bookings)
      .where(and(eq(bookings.userId, user.id), eq(bookings.paymentStatus, "paid"))),
    db
      .select({ n: count() })
      .from(favorites)
      .where(eq(favorites.userId, user.id)),
    db
      .select({
        id: bookings.id,
        scheduledAt: bookings.scheduledAt,
        address: bookings.address,
        status: bookings.status,
        paymentStatus: bookings.paymentStatus,
        priceQuoted: bookings.priceQuoted,
        upiTxnRef: bookings.upiTxnRef,
        providerId: providers.userId,
        providerName: users.name,
        providerImage: users.image,
        providerCity: providers.city,
        providerHeadline: providers.headline,
      })
      .from(bookings)
      .innerJoin(providers, eq(providers.userId, bookings.providerId))
      .innerJoin(users, eq(users.id, providers.userId))
      .where(and(eq(bookings.userId, user.id), inArray(bookings.status, [...ACTIVE_STATUSES])))
      .orderBy(bookings.scheduledAt)
      .limit(3) as Promise<UpcomingBookingRow[]>,
    db
      .select({
        userId: providers.userId,
        name: users.name,
        image: users.image,
        headline: providers.headline,
        city: providers.city,
        state: providers.state,
        hourlyRateMin: providers.hourlyRateMin,
        hourlyRateMax: providers.hourlyRateMax,
        ratingAvg: providers.ratingAvg,
        ratingCount: providers.ratingCount,
        isOnline: providers.isOnline,
        aadhaarStatus: providers.aadhaarStatus,
        ondcParticipantId: providers.ondcParticipantId,
      })
      .from(favorites)
      .innerJoin(providers, eq(providers.userId, favorites.providerId))
      .innerJoin(users, eq(users.id, providers.userId))
      .where(eq(favorites.userId, user.id))
      .orderBy(desc(favorites.createdAt))
      .limit(4),
  ]);

  const favIds = favProviders.map((p) => p.userId);
  const catRows = favIds.length
    ? await db
        .select({ providerId: providerCategories.providerId, slug: providerCategories.categorySlug })
        .from(providerCategories)
        .where(inArray(providerCategories.providerId, favIds))
    : [];
  const catsByProvider = new Map<string, string[]>();
  for (const r of catRows) {
    const arr = catsByProvider.get(r.providerId) ?? [];
    arr.push(r.slug);
    catsByProvider.set(r.providerId, arr);
  }

  const activeCount = activeRow[0]?.n ?? 0;
  const completedCount = completedRow[0]?.n ?? 0;
  const totalSpent = Number(spentRow[0]?.total ?? 0);
  const favCount = favRow[0]?.n ?? 0;

  const quickCategories = favProviders.length
    ? Array.from(new Set(catRows.map((r) => r.slug))).slice(0, 6)
    : CATEGORIES.slice(0, 6).map((c) => c.slug);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {user.locale === "hi" ? "नमस्ते" : "Welcome back"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {firstName(user.name)}
          </h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/browse">
            <Compass className="size-4" aria-hidden="true" />
            {user.locale === "hi" ? "खोजें" : "Browse services"}
          </Link>
        </Button>
      </header>

      <section
        aria-label="Account overview"
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="Active bookings"
          value={String(activeCount)}
          icon={<CalendarClock className="size-4" aria-hidden="true" />}
          href="/bookings?tab=upcoming"
        />
        <KpiCard
          label="Completed"
          value={String(completedCount)}
          icon={<CheckCircle2 className="size-4" aria-hidden="true" />}
          href="/bookings?tab=past"
        />
        <KpiCard
          label="Total spent"
          value={formatINR(totalSpent)}
          icon={<IndianRupee className="size-4" aria-hidden="true" />}
        />
        <KpiCard
          label="Favorites"
          value={String(favCount)}
          icon={<Heart className="size-4" aria-hidden="true" />}
          href="/favorites"
        />
      </section>

      <section aria-labelledby="upcoming-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="upcoming-heading" className="text-lg font-semibold tracking-tight">
            Upcoming bookings
          </h2>
          <Button asChild variant="link" size="sm" className="h-auto px-0">
            <Link href="/bookings">
              View all
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <CalendarClock className="size-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No upcoming bookings yet.</p>
              <Button asChild size="sm">
                <Link href="/browse">Find a provider</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3">
            {upcoming.map((b) => (
              <li key={b.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-start gap-4 p-4">
                    <Avatar className="size-12 border">
                      {b.providerImage ? <AvatarImage src={b.providerImage} alt="" /> : null}
                      <AvatarFallback>{initials(b.providerName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/providers/${b.providerId}`}
                        className="truncate text-sm font-semibold hover:underline"
                      >
                        {b.providerName}
                      </Link>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {b.providerHeadline}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="size-3.5" aria-hidden="true" />
                          {formatScheduled(b.scheduledAt, user.locale)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" aria-hidden="true" />
                          <span className="line-clamp-1 max-w-[18rem]">{b.address}</span>
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {b.status.replace("_", " ")}
                        </Badge>
                        <Badge
                          variant={b.paymentStatus === "paid" ? "success" : "outline"}
                          className="capitalize"
                        >
                          {b.paymentStatus}
                        </Badge>
                        <span className="text-sm font-semibold text-foreground">
                          {formatINR(b.priceQuoted)}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/providers/${b.providerId}`}>View</Link>
                      </Button>
                      {b.paymentStatus === "unpaid" || b.paymentStatus === "failed" ? (
                        <Button asChild size="sm">
                          <Link href={`/bookings#${b.id}`}>Pay via UPI</Link>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="favorites-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="favorites-heading" className="text-lg font-semibold tracking-tight">
            Saved providers
          </h2>
          <Button asChild variant="link" size="sm" className="h-auto px-0">
            <Link href="/favorites">
              View all
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        {favProviders.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 py-6">
              <p className="text-sm text-muted-foreground">
                You haven&apos;t saved any providers yet. Try a category to get started.
              </p>
              <ul className="flex flex-wrap gap-2">
                {quickCategories.map((slug) => {
                  const cat = getCategory(slug);
                  if (!cat) return null;
                  return (
                    <li key={slug}>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/browse?category=${slug}`}>
                          {user.locale === "hi" ? cat.nameHi : cat.nameEn}
                        </Link>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {favProviders.map((p) => (
              <ProviderCard
                key={p.userId}
                data={{
                  user: { id: p.userId, name: p.name, image: p.image },
                  provider: {
                    userId: p.userId,
                    headline: p.headline,
                    city: p.city,
                    state: p.state,
                    hourlyRateMin: p.hourlyRateMin,
                    hourlyRateMax: p.hourlyRateMax,
                    ratingAvg: p.ratingAvg,
                    ratingCount: p.ratingCount,
                    isOnline: p.isOnline,
                    aadhaarStatus: p.aadhaarStatus,
                    ondcParticipantId: p.ondcParticipantId,
                  },
                  categories: catsByProvider.get(p.userId) ?? [],
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="explore-heading">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle id="explore-heading" className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-amber-500" aria-hidden="true" />
              Continue exploring
            </CardTitle>
            <Button asChild size="sm">
              <Link href="/browse">
                Browse all
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {CATEGORIES.slice(0, 10).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/browse?category=${c.slug}`}
                    className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {user.locale === "hi" ? c.nameHi : c.nameEn}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const body = (
    <Card className="h-full transition-shadow hover:shadow-sm">
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  ) : (
    <div>{body}</div>
  );
}
