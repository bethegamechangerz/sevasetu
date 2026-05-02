import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Star,
  XCircle,
} from "lucide-react";
import { and, desc, eq, gte } from "drizzle-orm";

import { AvailabilityToggle } from "@/components/availability-toggle";
import { BookingRow } from "@/components/provider/booking-row";
import { KpiCard } from "@/components/provider/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { bookings, providers, users } from "@/lib/db/schema";
import { simulateRegistryLookup } from "@/lib/ondc/adapter";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Provider dashboard",
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function ProviderDashboardPage() {
  const user = await requireRole(["provider", "admin"]);

  const provider = await db.query.providers.findFirst({
    where: eq(providers.userId, user.id),
  });
  if (!provider) {
    redirect("/provider/onboarding");
  }

  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const recent = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      priceQuoted: bookings.priceQuoted,
      scheduledAt: bookings.scheduledAt,
      address: bookings.address,
      notes: bookings.notes,
      customerId: bookings.userId,
      customerName: users.name,
      customerPhone: users.phone,
    })
    .from(bookings)
    .leftJoin(users, eq(users.id, bookings.userId))
    .where(
      and(
        eq(bookings.providerId, user.id),
        gte(bookings.createdAt, since),
      ),
    )
    .orderBy(desc(bookings.scheduledAt));

  let total = 0;
  let completed = 0;
  let cancelled = 0;
  let collected = 0;
  for (const b of recent) {
    total += 1;
    if (b.status === "completed") {
      completed += 1;
      collected += b.priceQuoted;
    } else if (b.status === "cancelled" || b.status === "no_show") {
      cancelled += 1;
    }
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todays = recent.filter(
    (b) =>
      b.scheduledAt >= todayStart &&
      b.scheduledAt < todayEnd &&
      (b.status === "accepted" || b.status === "in_progress" || b.status === "pending"),
  );
  const pendingRequests = recent.filter((b) => b.status === "pending");

  const ondcSubscribed = Boolean(provider.ondcParticipantId);
  const ondcRegistry = ondcSubscribed
    ? simulateRegistryLookup(provider.ondcParticipantId!)
    : null;

  return (
    <main id="main" className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Hello, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Last 30 days at a glance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {ondcRegistry ? (
            <Badge variant="success" title={`ONDC participant ${ondcRegistry.participantId}`}>
              ONDC subscribed
            </Badge>
          ) : (
            <Badge variant="outline">ONDC not subscribed</Badge>
          )}
          <AvailabilityToggle initial={provider.isOnline} />
        </div>
      </header>

      <section
        aria-label="Key metrics"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        <KpiCard
          label="Bookings"
          value={total}
          icon={Calendar}
          hint="Last 30 days"
        />
        <KpiCard
          label="Completed"
          value={completed}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="Cancelled"
          value={cancelled}
          icon={XCircle}
          tone="destructive"
        />
        <KpiCard
          label="Collected"
          value={formatINR(collected)}
          icon={CircleDollarSign}
          hint="Quoted on completed bookings"
        />
        <KpiCard
          label="Rating"
          value={
            provider.ratingCount > 0
              ? provider.ratingAvg.toFixed(1)
              : "—"
          }
          icon={Star}
          hint={`${provider.ratingCount} review${provider.ratingCount === 1 ? "" : "s"}`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="todays-bookings">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="todays-bookings" className="text-lg font-semibold">
              Today&apos;s bookings
            </h2>
            <span className="text-xs text-muted-foreground">
              {todays.length} scheduled
            </span>
          </div>
          {todays.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nothing scheduled today. Stay online to receive new requests.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todays.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={{
                    id: b.id,
                    customerName: b.customerName ?? "Customer",
                    customerPhone: b.customerPhone,
                    serviceTitle: null,
                    scheduledAt: b.scheduledAt.toISOString(),
                    address: b.address,
                    notes: b.notes,
                    priceQuoted: b.priceQuoted,
                    status: b.status,
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="pending-requests">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="pending-requests" className="text-lg font-semibold">
              Pending requests
            </h2>
            <span className="text-xs text-muted-foreground">
              {pendingRequests.length} waiting
            </span>
          </div>
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No pending requests. New bookings show up here for your approval.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={{
                    id: b.id,
                    customerName: b.customerName ?? "Customer",
                    customerPhone: b.customerPhone,
                    serviceTitle: null,
                    scheduledAt: b.scheduledAt.toISOString(),
                    address: b.address,
                    notes: b.notes,
                    priceQuoted: b.priceQuoted,
                    status: b.status,
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
