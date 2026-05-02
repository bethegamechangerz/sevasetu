"use client";

import { useState, type ReactNode } from "react";
import { List, Map } from "lucide-react";

import { cn } from "@/lib/utils";

type Tab = "list" | "map";

export function BrowseShell({
  list,
  map,
  resultCount,
}: {
  list: ReactNode;
  map: ReactNode;
  resultCount: number;
}) {
  const [tab, setTab] = useState<Tab>("list");

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6">
      <div
        role="tablist"
        aria-label="Switch between list and map view"
        className="mb-3 inline-flex rounded-lg border bg-muted p-1 text-sm md:hidden"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "list"}
          onClick={() => setTab("list")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
            tab === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <List className="h-4 w-4" aria-hidden="true" />
          List
          <span className="ml-1 rounded bg-muted-foreground/15 px-1 text-[10px] tabular-nums">{resultCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "map"}
          onClick={() => setTab("map")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
            tab === "map" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Map className="h-4 w-4" aria-hidden="true" />
          Map
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <section
          aria-label="Provider results"
          className={cn("min-w-0", tab === "map" ? "hidden md:block" : "block")}
        >
          {list}
        </section>

        <aside
          aria-label="Map of nearby providers"
          className={cn(
            "min-w-0",
            tab === "list" ? "hidden md:block" : "block",
            "md:sticky md:top-[7.5rem] md:h-[calc(100vh-9rem)]",
          )}
        >
          <div className="h-[60vh] md:h-full">{map}</div>
        </aside>
      </div>
    </div>
  );
}
