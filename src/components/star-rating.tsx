"use client";

import * as React from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export type StarRatingProps = {
  value: number;
  max?: number;
  size?: number;
  className?: string;
  interactive?: boolean;
  onChange?: (next: number) => void;
  ariaLabel?: string;
};

export function StarRating({
  value,
  max = 5,
  size = 16,
  className,
  interactive = false,
  onChange,
  ariaLabel,
}: StarRatingProps) {
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const display = hoverIdx ?? value;

  if (!interactive) {
    return (
      <span
        className={cn("inline-flex items-center gap-0.5", className)}
        role="img"
        aria-label={ariaLabel ?? `Rated ${value.toFixed(1)} out of ${max}`}
      >
        {Array.from({ length: max }).map((_, i) => {
          const idx = i + 1;
          const filled = display >= idx;
          const half = !filled && display >= idx - 0.5;
          return (
            <span key={idx} className="relative inline-block" style={{ width: size, height: size }}>
              <Star
                width={size}
                height={size}
                className="absolute inset-0 text-amber-400"
                aria-hidden
                fill={filled ? "currentColor" : "transparent"}
                strokeWidth={1.5}
              />
              {half ? (
                <Star
                  width={size}
                  height={size}
                  className="absolute inset-0 text-amber-400"
                  aria-hidden
                  fill="currentColor"
                  strokeWidth={1.5}
                  style={{ clipPath: "inset(0 50% 0 0)" }}
                />
              ) : null}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <span
      role="radiogroup"
      aria-label={ariaLabel ?? "Rate from 1 to 5 stars"}
      className={cn("inline-flex items-center gap-1", className)}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {Array.from({ length: max }).map((_, i) => {
        const idx = i + 1;
        const filled = display >= idx;
        return (
          <button
            type="button"
            key={idx}
            role="radio"
            aria-checked={value === idx}
            aria-label={`${idx} star${idx === 1 ? "" : "s"}`}
            onMouseEnter={() => setHoverIdx(idx)}
            onFocus={() => setHoverIdx(idx)}
            onBlur={() => setHoverIdx(null)}
            onClick={() => onChange?.(idx)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                onChange?.(Math.max(1, value - 1));
              } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                onChange?.(Math.min(max, value + 1));
              }
            }}
            className="rounded-sm p-0.5 text-amber-400 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              width={size + 4}
              height={size + 4}
              fill={filled ? "currentColor" : "transparent"}
              strokeWidth={1.5}
              aria-hidden
            />
          </button>
        );
      })}
    </span>
  );
}
