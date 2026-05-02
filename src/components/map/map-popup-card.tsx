import Link from "next/link";

import { Star } from "lucide-react";

export type MapPopupCardProps = {
  name: string;
  headline?: string;
  ratingAvg: number;
  ratingCount?: number;
  href: string;
};

export function MapPopupCard({ name, headline, ratingAvg, ratingCount, href }: MapPopupCardProps) {
  return (
    <div className="min-w-[180px] space-y-1">
      <div className="text-sm font-semibold leading-tight text-foreground">{name}</div>
      {headline ? <div className="line-clamp-2 text-xs text-muted-foreground">{headline}</div> : null}
      <div className="flex items-center gap-1 text-xs text-foreground">
        <Star className="h-3 w-3 fill-amber-400 text-amber-500" aria-hidden="true" />
        <span className="font-medium">{ratingAvg.toFixed(1)}</span>
        {typeof ratingCount === "number" ? (
          <span className="text-muted-foreground">({ratingCount})</span>
        ) : null}
      </div>
      <Link
        href={href}
        className="mt-1 inline-flex h-7 items-center justify-center rounded-md bg-emerald-600 px-2 text-xs font-medium text-white hover:bg-emerald-700"
      >
        View profile
      </Link>
    </div>
  );
}
