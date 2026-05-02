import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { BookingRow, type BookingRowData } from "@/components/provider/booking-row";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { bookings, providers, services, users } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "Bookings",
};

interface Bucket {
  key: "incoming" | "upcoming" | "completed" | "cancelled";
  label: string;
  empty: string;
  items: BookingRowData[];
}

export default async function ProviderBookingsPage() {
  const user = await requireRole(["provider", "admin"]);

  const provider = await db.query.providers.findFirst({
    where: eq(providers.userId, user.id),
  });
  if (!provider) {
    redirect("/provider/onboarding");
  }

  const rows = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      priceQuoted: bookings.priceQuoted,
      scheduledAt: bookings.scheduledAt,
      address: bookings.address,
      notes: bookings.notes,
      customerName: users.name,
      customerPhone: users.phone,
      serviceTitle: services.title,
    })
    .from(bookings)
    .leftJoin(users, eq(users.id, bookings.userId))
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(eq(bookings.providerId, user.id))
    .orderBy(desc(bookings.scheduledAt));

  const all: BookingRowData[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    priceQuoted: r.priceQuoted,
    scheduledAt: r.scheduledAt.toISOString(),
    address: r.address,
    notes: r.notes,
    customerName: r.customerName ?? "Customer",
    customerPhone: r.customerPhone,
    serviceTitle: r.serviceTitle,
  }));

  const buckets: Bucket[] = [
    {
      key: "incoming",
      label: "Incoming",
      empty: "No new requests right now.",
      items: all.filter((b) => b.status === "pending"),
    },
    {
      key: "upcoming",
      label: "Upcoming",
      empty: "Nothing scheduled yet.",
      items: all.filter(
        (b) => b.status === "accepted" || b.status === "in_progress",
      ),
    },
    {
      key: "completed",
      label: "Completed",
      empty: "Once you finish a job it shows up here.",
      items: all.filter((b) => b.status === "completed"),
    },
    {
      key: "cancelled",
      label: "Cancelled",
      empty: "No cancellations.",
      items: all.filter(
        (b) => b.status === "cancelled" || b.status === "no_show",
      ),
    },
  ];

  return (
    <main id="main" className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Bookings
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Manage your jobs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Accept new requests, track work in progress, and review history.
        </p>
      </header>

      <Tabs defaultValue="incoming">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          {buckets.map((b) => (
            <TabsTrigger key={b.key} value={b.key}>
              {b.label}
              {b.items.length > 0 ? (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted-foreground/15 px-1 text-[10px] font-semibold tabular-nums">
                  {b.items.length}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        {buckets.map((bucket) => (
          <TabsContent key={bucket.key} value={bucket.key} className="space-y-3">
            {bucket.items.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  {bucket.empty}
                </CardContent>
              </Card>
            ) : (
              bucket.items.map((b) => <BookingRow key={b.id} booking={b} />)
            )}
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}
