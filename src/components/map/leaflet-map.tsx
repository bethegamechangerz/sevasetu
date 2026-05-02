"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  ratingAvg: number;
  ratingCount?: number;
  headline?: string;
  href: string;
};

export type LeafletMapProps = {
  center: { lat: number; lng: number };
  markers: MapMarker[];
  height?: string | number;
  className?: string;
  zoom?: number;
};

const proto = L.Icon.Default.prototype as { _getIconUrl?: unknown };
if (proto._getIconUrl) {
  delete proto._getIconUrl;
}

const PIN_SVG = `
<svg viewBox="0 0 28 36" width="28" height="36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <filter id="ssShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-opacity="0.35"/>
    </filter>
  </defs>
  <path d="M14 1c7.18 0 13 5.6 13 12.5 0 9-13 21.5-13 21.5S1 22.5 1 13.5C1 6.6 6.82 1 14 1z"
    fill="#10b981" stroke="white" stroke-width="2" filter="url(#ssShadow)"/>
  <circle cx="14" cy="13" r="4.5" fill="white"/>
</svg>`;

const userPin = L.divIcon({
  className: "ss-user-pin",
  html: `<div style="width:14px;height:14px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 0 0 2px rgba(37,99,235,.35),0 1px 2px rgba(0,0,0,.4);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function buildProviderIcon(): L.DivIcon {
  return L.divIcon({
    className: "ss-provider-pin",
    html: PIN_SVG,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
  });
}

function FitBounds({ markers, center }: { markers: MapMarker[]; center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) {
      map.setView([center.lat, center.lng], 12);
      return;
    }
    const bounds = L.latLngBounds(
      markers.map((m) => [m.lat, m.lng] as [number, number]).concat([[center.lat, center.lng]]),
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, markers, center.lat, center.lng]);
  return null;
}

export default function LeafletMap({
  center,
  markers,
  height = "100%",
  className,
  zoom = 12,
}: LeafletMapProps) {
  const providerIcon = useMemo(() => buildProviderIcon(), []);
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Map of nearby service providers"
      className={cn("relative overflow-hidden rounded-xl border bg-muted", className)}
      style={{ height }}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer url={publicEnv.NEXT_PUBLIC_TILE_URL} attribution={publicEnv.NEXT_PUBLIC_TILE_ATTRIBUTION} />

        <Marker position={[center.lat, center.lng]} icon={userPin}>
          <Popup>
            <div className="text-xs font-medium text-foreground">You are here</div>
          </Popup>
        </Marker>

        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={providerIcon}>
            <Popup>
              <div className="min-w-[180px] space-y-1">
                <div className="text-sm font-semibold leading-tight text-foreground">{m.name}</div>
                {m.headline ? (
                  <div className="line-clamp-2 text-xs text-muted-foreground">{m.headline}</div>
                ) : null}
                <div className="flex items-center gap-1 text-xs text-foreground">
                  <span aria-hidden="true">★</span>
                  <span className="font-medium">{m.ratingAvg.toFixed(1)}</span>
                  {typeof m.ratingCount === "number" ? (
                    <span className="text-muted-foreground">({m.ratingCount})</span>
                  ) : null}
                </div>
                <a
                  href={m.href}
                  className="mt-1 inline-flex h-7 items-center justify-center rounded-md bg-emerald-600 px-2 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  View profile
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        <FitBounds markers={markers} center={center} />
      </MapContainer>
    </div>
  );
}
