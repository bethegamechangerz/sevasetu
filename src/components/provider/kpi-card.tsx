import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive";
  className?: string;
}

const TONE_BG: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "bg-muted text-foreground",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  destructive: "bg-destructive/15 text-destructive",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="flex items-start gap-3 p-5">
        {Icon ? (
          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
              TONE_BG[tone],
            )}
            aria-hidden="true"
          >
            <Icon className="size-4" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 truncate text-2xl font-semibold tabular-nums leading-tight text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
