"use client";

import * as React from "react";
import { Check, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface RolePillCardProps {
  value: string;
  selected: boolean;
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}

export function RolePillCard({
  value,
  selected,
  title,
  description,
  icon: Icon,
  onClick,
}: RolePillCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-value={value}
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all",
        "hover:border-primary/40 hover:bg-accent/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "motion-reduce:transition-none",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary"
          : "border-input",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border",
          selected
            ? "border-primary/30 bg-primary text-primary-foreground"
            : "border-input bg-muted text-foreground",
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-sm font-medium leading-tight">{title}</span>
        <span className="mt-0.5 text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      {selected ? (
        <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
      ) : null}
    </button>
  );
}
