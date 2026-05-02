"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { LeafletMapProps } from "./leaflet-map";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center rounded-xl border bg-muted"
      role="status"
      aria-label="Loading map"
    >
      <Skeleton className="h-full w-full rounded-xl" />
    </div>
  ),
});

export type DynamicMapProps = LeafletMapProps;

export function DynamicMap(props: DynamicMapProps) {
  return <LeafletMap {...props} />;
}

export default DynamicMap;
