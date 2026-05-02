import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";

import { ServiceList, type ServiceListItem } from "@/components/services/service-list";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { providers, services } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "Services",
};

export default async function ProviderServicesPage() {
  const user = await requireRole(["provider", "admin"]);

  const provider = await db.query.providers.findFirst({
    where: eq(providers.userId, user.id),
  });
  if (!provider) {
    redirect("/provider/onboarding");
  }

  const rows = await db.query.services.findMany({
    where: eq(services.providerId, user.id),
    orderBy: [asc(services.createdAt)],
  });

  const items: ServiceListItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    categorySlug: r.categorySlug,
    price: r.price,
    priceUnit: r.priceUnit,
    durationMinutes: r.durationMinutes ?? null,
    isActive: r.isActive,
  }));

  return (
    <main id="main" className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Catalogue
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Your services
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What you offer, the price, and how long it takes.
        </p>
      </header>
      <ServiceList services={items} />
    </main>
  );
}
