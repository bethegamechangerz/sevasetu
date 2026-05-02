"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Search, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type Props = {
  locale: Locale;
  defaultLocation?: string;
};

const ANY = "__any__";

export function SearchBar({ locale, defaultLocation = "" }: Props) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [location, setLocation] = React.useState(defaultLocation);
  const [category, setCategory] = React.useState<string>(ANY);
  const [locating, setLocating] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (location.trim()) params.set("loc", location.trim());
    if (category && category !== ANY) params.set("category", category);
    router.push(`/browse${params.size ? `?${params.toString()}` : ""}`);
  }

  function detectLocation() {
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError(locale === "hi" ? "स्थान उपलब्ध नहीं" : "Location not available");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        setLocation(`${lat}, ${lng}`);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? locale === "hi"
              ? "अनुमति अस्वीकृत"
              : "Permission denied"
            : locale === "hi"
              ? "स्थान नहीं मिला"
              : "Couldn't get location",
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  return (
    <form
      role="search"
      aria-label={t(locale, "common.search")}
      onSubmit={onSubmit}
      className="relative w-full"
    >
      <div className="grid gap-2 rounded-2xl border border-border/70 bg-background/95 p-2 shadow-xl shadow-primary/5 ring-1 ring-black/[0.02] backdrop-blur md:grid-cols-[1.4fr_1fr_0.9fr_auto] md:gap-1.5 md:rounded-full md:p-1.5">
        {/* Service query */}
        <label className="group flex items-center gap-2 rounded-xl bg-transparent px-3 py-1.5 transition-colors focus-within:bg-muted/50 md:rounded-full md:px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">{t(locale, "common.search")}</span>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(locale, "landing.searchPlaceholder")}
            className="h-10 border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm"
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>

        <div className="hidden md:flex md:items-center">
          <span aria-hidden="true" className="h-7 w-px bg-border/70" />
        </div>

        {/* Location */}
        <label className="group relative flex items-center gap-2 rounded-xl bg-transparent px-3 py-1.5 transition-colors focus-within:bg-muted/50 md:rounded-full md:px-4">
          <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">{t(locale, "common.location")}</span>
          <Input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t(locale, "landing.locationPlaceholder")}
            className="h-10 border-0 bg-transparent p-0 pr-8 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm"
            autoComplete="off"
            inputMode="text"
          />
          <button
            type="button"
            onClick={detectLocation}
            disabled={locating}
            aria-label={
              locale === "hi" ? "मेरे स्थान का उपयोग करें" : "Use my location"
            }
            className="absolute right-2 inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Crosshair className="size-3.5" aria-hidden="true" />
            )}
          </button>
        </label>

        <div className="hidden md:flex md:items-center">
          <span aria-hidden="true" className="h-7 w-px bg-border/70" />
        </div>

        {/* Category */}
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger
            aria-label={t(locale, "common.category")}
            className="h-12 rounded-xl border-0 bg-transparent px-3 text-base shadow-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 md:h-10 md:rounded-full md:text-sm"
          >
            <SelectValue
              placeholder={
                locale === "hi" ? "श्रेणी चुनें" : "Select a category"
              }
            />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ANY}>
              {locale === "hi" ? "कोई भी श्रेणी" : "Any category"}
            </SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {locale === "hi" ? c.nameHi : c.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="submit"
          size="lg"
          className="h-12 gap-2 rounded-xl px-6 text-base font-semibold md:h-12 md:rounded-full md:px-7 md:text-sm"
        >
          <Search className="size-4" aria-hidden="true" />
          {t(locale, "common.search")}
        </Button>
      </div>

      {geoError ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-2 text-xs text-destructive"
        >
          {geoError}
        </p>
      ) : null}
    </form>
  );
}
