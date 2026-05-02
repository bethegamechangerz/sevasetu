import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { Compass, Heart } from "lucide-react";

import { ProviderCard } from "@/components/provider-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth-helpers";
import { CATEGORIES } from "@/lib/categories";
import { db } from "@/lib/db";
import { favorites, providerCategories, providers, users } from "@/lib/db/schema";

export const metadata = {
  title: "Favorites",
  description: "Providers you have saved.",
};

export default async function FavoritesPage() {
  const user = await requireUser();
  if (user.role === "provider") redirect("/provider/dashboard");
  if (user.role === "admin") redirect("/admin");

  const rows = await db
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
      savedAt: favorites.createdAt,
    })
    .from(favorites)
    .innerJoin(providers, eq(providers.userId, favorites.providerId))
    .innerJoin(users, eq(users.id, providers.userId))
    .where(eq(favorites.userId, user.id))
    .orderBy(desc(favorites.createdAt));

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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Heart className="size-6 text-rose-500" aria-hidden="true" />
            Favorites
          </h1>
          <p className="text-sm text-muted-foreground">
            {rows.length === 0
              ? "Save providers you like and find them here next time."
              : `${rows.length} provider${rows.length === 1 ? "" : "s"} saved.`}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/browse">
            <Compass className="size-4" aria-hidden="true" />
            Browse
          </Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <Heart className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">No favorites yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Tap the heart on any provider to save them here for quick access.
            </p>
            <ul className="mt-2 flex flex-wrap justify-center gap-2">
              {CATEGORIES.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/browse?category=${c.slug}`}>
                      {user.locale === "hi" ? c.nameHi : c.nameEn}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
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
    </div>
  );
}
