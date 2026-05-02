"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Locate, Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES } from "@/lib/categories";
import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

const RADIUS_OPTIONS = [5, 10, 15, 25, 50] as const;

const RATING_OPTIONS = [
  { value: "any", label: "Any rating" },
  { value: "4", label: "4.0 +" },
  { value: "4.5", label: "4.5 +" },
  { value: "5", label: "5.0" },
] as const;

const ANY_CATEGORY = "any";

type Props = {
  className?: string;
};

export function FilterBar({ className }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [locating, setLocating] = useState(false);

  const initial = useMemo(
    () => ({
      q: search.get("q") ?? "",
      category: search.get("category") ?? ANY_CATEGORY,
      radiusKm: search.get("radiusKm") ?? "15",
      minRating: search.get("minRating") ?? "any",
      maxPrice: search.get("maxPrice") ?? "",
      online: search.get("online") === "1",
      lat: search.get("lat") ?? "",
      lng: search.get("lng") ?? "",
    }),
    [search],
  );

  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [radiusKm, setRadiusKm] = useState(initial.radiusKm);
  const [minRating, setMinRating] = useState(initial.minRating);
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice);
  const [online, setOnline] = useState(initial.online);
  const [lat, setLat] = useState(initial.lat);
  const [lng, setLng] = useState(initial.lng);

  const pushFilters = useCallback(
    (overrides?: Partial<{
      q: string;
      category: string;
      radiusKm: string;
      minRating: string;
      maxPrice: string;
      online: boolean;
      lat: string;
      lng: string;
    }>) => {
      const params = new URLSearchParams();
      const next = {
        q: overrides?.q ?? q,
        category: overrides?.category ?? category,
        radiusKm: overrides?.radiusKm ?? radiusKm,
        minRating: overrides?.minRating ?? minRating,
        maxPrice: overrides?.maxPrice ?? maxPrice,
        online: overrides?.online ?? online,
        lat: overrides?.lat ?? lat,
        lng: overrides?.lng ?? lng,
      };

      if (next.q.trim()) params.set("q", next.q.trim());
      if (next.category && next.category !== ANY_CATEGORY) params.set("category", next.category);
      if (next.radiusKm) params.set("radiusKm", next.radiusKm);
      if (next.minRating && next.minRating !== "any") params.set("minRating", next.minRating);
      if (next.maxPrice && Number(next.maxPrice) > 0) params.set("maxPrice", String(Number(next.maxPrice)));
      if (next.online) params.set("online", "1");
      if (next.lat) params.set("lat", next.lat);
      if (next.lng) params.set("lng", next.lng);

      const view = search.get("view");
      if (view) params.set("view", view);

      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `/browse?${qs}` : "/browse");
      });
    },
    [q, category, radiusKm, minRating, maxPrice, online, lat, lng, search, router],
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    pushFilters();
  };

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude.toFixed(6);
        const nextLng = pos.coords.longitude.toFixed(6);
        setLat(nextLat);
        setLng(nextLng);
        setLocating(false);
        pushFilters({ lat: nextLat, lng: nextLng });
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  };

  const clearAll = () => {
    setQ("");
    setCategory(ANY_CATEGORY);
    setRadiusKm("15");
    setMinRating("any");
    setMaxPrice("");
    setOnline(false);
    setLat("");
    setLng("");
    startTransition(() => router.push("/browse"));
  };

  const hasActive =
    !!initial.q ||
    initial.category !== ANY_CATEGORY ||
    initial.minRating !== "any" ||
    !!initial.maxPrice ||
    initial.online ||
    !!initial.lat;

  const locationLabel = lat && lng ? `${Number(lat).toFixed(2)}, ${Number(lng).toFixed(2)}` : publicEnv.NEXT_PUBLIC_DEFAULT_CITY;

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label="Find local service providers"
      className={cn(
        "sticky top-0 z-30 border-b bg-background/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:px-6",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:min-w-[220px] sm:max-w-md">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Label htmlFor="filter-q" className="sr-only">Search providers</Label>
            <Input
              id="filter-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search electricians, tutors, cooks…"
              className="pl-8"
              autoComplete="off"
              inputMode="search"
            />
          </div>

          <div className="min-w-[160px] flex-1 sm:flex-none">
            <Label htmlFor="filter-category" className="sr-only">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="filter-category" className="w-full sm:w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_CATEGORY}>All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden min-w-[120px] sm:block">
            <Label htmlFor="filter-radius" className="sr-only">Radius</Label>
            <Select value={radiusKm} onValueChange={setRadiusKm}>
              <SelectTrigger id="filter-radius" className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    Within {r} km
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={useMyLocation}
            disabled={locating}
            className="gap-1.5"
            aria-label={`Use my location. Currently ${locationLabel}`}
            title="Use my current location"
          >
            <Locate className={cn("h-4 w-4", locating && "animate-pulse")} aria-hidden="true" />
            <span className="hidden sm:inline">{locating ? "Locating…" : "My location"}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowAdvanced((s) => !s)}
            aria-expanded={showAdvanced}
            aria-controls="filter-advanced"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">More</span>
          </Button>

          <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
            <Search className="h-4 w-4" aria-hidden="true" />
            <span>{isPending ? "Searching…" : "Search"}</span>
          </Button>
        </div>

        {showAdvanced ? (
          <div
            id="filter-advanced"
            className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="sm:hidden">
              <Label htmlFor="filter-radius-m" className="text-xs">Radius</Label>
              <Select value={radiusKm} onValueChange={setRadiusKm}>
                <SelectTrigger id="filter-radius-m">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      Within {r} km
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-rating" className="text-xs">Minimum rating</Label>
              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger id="filter-rating">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATING_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-max-price" className="text-xs">Max price (₹/visit)</Label>
              <Input
                id="filter-max-price"
                type="number"
                inputMode="numeric"
                min={50}
                step={50}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="No limit"
              />
            </div>

            <div className="flex items-end justify-between gap-3 rounded-md border bg-background px-3 py-2">
              <div>
                <Label htmlFor="filter-online" className="text-xs">Online now only</Label>
                <p className="text-[11px] text-muted-foreground">Available right now</p>
              </div>
              <Switch
                id="filter-online"
                checked={online}
                onCheckedChange={(v) => setOnline(Boolean(v))}
                aria-label="Show only providers who are online now"
              />
            </div>
          </div>
        ) : null}

        {hasActive ? (
          <div className="flex items-center justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear filters
            </Button>
          </div>
        ) : null}
      </div>
    </form>
  );
}
