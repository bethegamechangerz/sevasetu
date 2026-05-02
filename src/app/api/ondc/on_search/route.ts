import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { providers, services, users } from "@/lib/db/schema";
import { bboxAround } from "@/lib/geo";
import {
  type BecknContext,
  buildOnSearchCatalog,
  newBecknContext,
} from "@/lib/ondc/adapter";

export const runtime = "nodejs";

type OnSearchBody = {
  context?: Partial<BecknContext>;
  message?: {
    intent?: {
      fulfillment?: { end?: { location?: { gps?: string } } };
      category?: { id?: string };
    };
  };
};

export async function POST(req: Request) {
  let body: OnSearchBody;
  try {
    body = (await req.json()) as OnSearchBody;
  } catch {
    return NextResponse.json(
      { message: { ack: { status: "NACK" } }, error: { code: "VALIDATION", message: "Invalid JSON body" } },
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const gps = body.message?.intent?.fulfillment?.end?.location?.gps;
  let lat = 28.6139;
  let lng = 77.209; // Delhi default
  if (typeof gps === "string") {
    const [latS, lngS] = gps.split(",").map((s) => s.trim());
    const pLat = Number(latS);
    const pLng = Number(lngS);
    if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
      lat = pLat;
      lng = pLng;
    }
  }

  const box = bboxAround(lat, lng, 15);
  const rows = await db
    .select({
      providerId: providers.userId,
      name: users.name,
      headline: providers.headline,
      bio: providers.bio,
      lat: providers.lat,
      lng: providers.lng,
    })
    .from(providers)
    .innerJoin(users, eq(users.id, providers.userId))
    .where(
      and(
        eq(providers.isAcceptingBookings, true),
        gte(providers.lat, box.minLat),
        lte(providers.lat, box.maxLat),
        gte(providers.lng, box.minLng),
        lte(providers.lng, box.maxLng),
      ),
    )
    .limit(20);

  const providerIds = rows.map((r) => r.providerId);
  const svcRows =
    providerIds.length > 0
      ? await db
          .select()
          .from(services)
          .where(and(eq(services.isActive, true)))
      : [];
  const byProvider = new Map<string, typeof svcRows>();
  for (const s of svcRows) {
    if (!providerIds.includes(s.providerId)) continue;
    const list = byProvider.get(s.providerId) ?? [];
    list.push(s);
    byProvider.set(s.providerId, list);
  }

  const baseCtx: Partial<BecknContext> = body.context ?? {};
  const ctx = newBecknContext({
    action: "on_search",
    transaction_id: baseCtx.transaction_id ?? newBecknContext({ action: "on_search" }).transaction_id,
    message_id: baseCtx.message_id ?? newBecknContext({ action: "on_search" }).message_id,
    bap_id: baseCtx.bap_id ?? "external.bap",
    bap_uri: baseCtx.bap_uri ?? "https://bap.example.com",
    city: baseCtx.city ?? "std:011",
  });

  const catalog = buildOnSearchCatalog({
    ctx,
    providers: rows.map((r) => ({
      id: r.providerId,
      name: r.name,
      descriptor: r.headline,
      locationGps: `${r.lat},${r.lng}`,
      items: (byProvider.get(r.providerId) ?? []).map((s) => ({
        id: s.id,
        name: s.title,
        description: s.description,
        priceInr: s.price,
      })),
    })),
  });

  return NextResponse.json(catalog, { headers: { "Content-Type": "application/json" } });
}
