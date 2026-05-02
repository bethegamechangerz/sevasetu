import Link from "next/link";
import { MapPin, ShieldCheck, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/star-rating";
import { getCategory } from "@/lib/categories";
import type { Provider, User } from "@/lib/db/schema";
import { cn, formatINR, formatNumber, initials } from "@/lib/utils";

export type ProviderCardData = {
  user: Pick<User, "id" | "name" | "image">;
  provider: Pick<
    Provider,
    | "userId"
    | "headline"
    | "city"
    | "state"
    | "hourlyRateMin"
    | "hourlyRateMax"
    | "ratingAvg"
    | "ratingCount"
    | "isOnline"
    | "aadhaarStatus"
    | "ondcParticipantId"
  >;
  categories?: string[];
};

export type ProviderCardProps = {
  data: ProviderCardData;
  distanceKm?: number;
  primaryCategory?: string;
  className?: string;
};

export function ProviderCard({ data, distanceKm, primaryCategory, className }: ProviderCardProps) {
  const { user, provider, categories } = data;
  const href = `/providers/${provider.userId}`;
  const aadhaarVerified = provider.aadhaarStatus === "verified";
  const ondc = Boolean(provider.ondcParticipantId);

  const visibleCategories = (categories ?? (primaryCategory ? [primaryCategory] : [])).slice(0, 3);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 border">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                href={href}
                className="truncate text-base font-semibold text-foreground outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
              >
                {user.name}
              </Link>
              {aadhaarVerified ? (
                <Badge
                  variant="success"
                  className="gap-1 px-1.5 py-0"
                  aria-label="Aadhaar verified"
                  title="Aadhaar verified"
                >
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  <span className="text-[10px] font-semibold">Verified</span>
                </Badge>
              ) : null}
              {ondc ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0 text-emerald-700 dark:text-emerald-400"
                  aria-label="ONDC participant (simulated demo)"
                  title="ONDC participant (simulated demo)"
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  <span className="text-[10px] font-semibold">ONDC</span>
                </Badge>
              ) : null}
              {provider.isOnline ? (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                  title="Available now"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  Online
                </span>
              ) : null}
            </div>

            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{provider.headline}</p>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1" aria-label={`Rated ${provider.ratingAvg.toFixed(1)} out of 5`}>
                <StarRating value={provider.ratingAvg} size={14} />
                <span className="font-semibold text-foreground">{provider.ratingAvg.toFixed(1)}</span>
                <span>({formatNumber(provider.ratingCount)})</span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                <span>
                  {provider.city}
                  {typeof distanceKm === "number" ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="font-medium text-foreground">{distanceKm.toFixed(1)} km</span>
                    </>
                  ) : null}
                </span>
              </span>
            </div>

            {visibleCategories.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {visibleCategories.map((slug) => {
                  const cat = getCategory(slug);
                  if (!cat) return null;
                  return (
                    <Badge key={slug} variant="secondary" className="text-[10px] font-medium">
                      {cat.nameEn}
                    </Badge>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">From</div>
              <div className="text-sm font-bold text-foreground">{formatINR(provider.hourlyRateMin)}</div>
              <div className="text-[10px] text-muted-foreground">
                up to {formatINR(provider.hourlyRateMax)}/hr
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProviderCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
            <div className="flex gap-1">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="ml-auto h-3 w-10" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
