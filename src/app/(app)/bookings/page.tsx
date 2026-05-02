import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { CalendarPlus, Inbox } from "lucide-react";

import { BookingRow, type BookingRowData } from "@/components/customer/booking-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { bookings, providers, reviews, users } from "@/lib/db/schema";

export const metadata = {
  title: "My bookings",
  description: "Track your upcoming, past and cancelled bookings.",
};

const UPCOMING_STATUSES = ["pending", "accepted", "in_progress"] as const;
const CANCELLED_STATUSES = ["cancelled", "no_show"] as const;

type Tab = "upcoming" | "past" | "cancelled";

function resolveTab(v: string | string[] | undefined): Tab {
  const raw = Array.isArray(v) ? v[0] : v;
  return raw === "past" || raw === "cancelled" ? raw : "upcoming";
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const user = await requireUser();
  if (user.role === "provider") redirect("/provider/bookings");
  if (user.role === "admin") redirect("/admin");

  const tab = resolveTab((await searchParams).tab);

  const rows = await db
    .select({
      id: bookings.id,
      scheduledAt: bookings.scheduledAt,
      address: bookings.address,
      notes: bookings.notes,
      priceQuoted: bookings.priceQuoted,
      status: bookings.status,
      paymentStatus: bookings.paymentStatus,
      upiTxnRef: bookings.upiTxnRef,
      cancelledReason: bookings.cancelledReason,
      completedAt: bookings.completedAt,
      createdAt: bookings.createdAt,
      providerId: providers.userId,
      providerName: users.name,
      providerImage: users.image,
      providerHeadline: providers.headline,
      providerCity: providers.city,
      providerUpiVpa: providers.upiVpa,
    })
    .from(bookings)
    .innerJoin(providers, eq(providers.userId, bookings.providerId))
    .innerJoin(users, eq(users.id, providers.userId))
    .where(eq(bookings.userId, user.id))
    .orderBy(desc(bookings.scheduledAt));

  const completedIds = rows
    .filter((r) => r.status === "completed")
    .map((r) => r.id);

  const reviewed = completedIds.length
    ? await db
        .select({ bookingId: reviews.bookingId })
        .from(reviews)
        .where(
          and(
            inArray(reviews.bookingId, completedIds),
            eq(reviews.reviewerId, user.id),
          ),
        )
    : [];
  const reviewedSet = new Set(
    reviewed
      .map((r) => r.bookingId)
      .filter((v): v is string => typeof v === "string"),
  );

  const upcomingSet = new Set<string>(UPCOMING_STATUSES);
  const cancelledSet = new Set<string>(CANCELLED_STATUSES);

  const enriched: BookingRowData[] = rows.map((r) => ({
    id: r.id,
    scheduledAt: r.scheduledAt.toISOString(),
    address: r.address,
    notes: r.notes,
    priceQuoted: r.priceQuoted,
    status: r.status,
    paymentStatus: r.paymentStatus,
    upiTxnRef: r.upiTxnRef,
    cancelledReason: r.cancelledReason,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    provider: {
      id: r.providerId,
      name: r.providerName,
      image: r.providerImage,
      headline: r.providerHeadline,
      city: r.providerCity,
      upiVpa: r.providerUpiVpa,
    },
    hasReview: reviewedSet.has(r.id),
    locale: user.locale,
  }));

  const upcoming = enriched.filter((b) => upcomingSet.has(b.status));
  const past = enriched.filter((b) => b.status === "completed");
  const cancelled = enriched.filter((b) => cancelledSet.has(b.status));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My bookings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your scheduled, past, and cancelled service requests.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/browse">
            <CalendarPlus className="size-4" aria-hidden="true" />
            New booking
          </Link>
        </Button>
      </header>

      <Tabs defaultValue={tab} className="space-y-4">
        <TabsList className="h-10 w-full justify-start gap-1 bg-muted/60">
          <TabsTrigger value="upcoming" className="gap-2">
            Upcoming
            <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
              {upcoming.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            Past
            <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
              {past.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="gap-2">
            Cancelled
            <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
              {cancelled.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <BookingList items={upcoming} emptyTitle="No upcoming bookings" emptyHint="Book a service to see it here." />
        </TabsContent>
        <TabsContent value="past">
          <BookingList items={past} emptyTitle="No past bookings" emptyHint="Completed bookings will appear here." />
        </TabsContent>
        <TabsContent value="cancelled">
          <BookingList
            items={cancelled}
            emptyTitle="No cancelled bookings"
            emptyHint="Cancellations and no-shows will appear here."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookingList({
  items,
  emptyTitle,
  emptyHint,
}: {
  items: BookingRowData[];
  emptyTitle: string;
  emptyHint: string;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">{emptyTitle}</p>
          <p className="text-xs text-muted-foreground">{emptyHint}</p>
          <Button asChild size="sm" className="mt-2">
            <Link href="/browse">Browse services</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <ul className="grid gap-3">
      {items.map((b) => (
        <li key={b.id}>
          <BookingRow data={b} />
        </li>
      ))}
    </ul>
  );
}

