import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, bookings, providers, services } from "@/lib/db/schema";
import { type BecknContext, newBecknContext } from "@/lib/ondc/adapter";

export const runtime = "nodejs";

type ConfirmBody = {
  context?: Partial<BecknContext>;
  message?: {
    order?: {
      provider?: { id?: string };
      items?: Array<{ id?: string; quantity?: { count?: number } }>;
      billing?: { name?: string; address?: { door?: string; building?: string; city?: string; state?: string; area_code?: string } };
      fulfillment?: {
        end?: { location?: { gps?: string; address?: { name?: string } }; time?: { timestamp?: string } };
        customer?: { person?: { name?: string }; contact?: { phone?: string } };
      };
      quote?: { price?: { value?: string } };
      payment?: { params?: { transaction_id?: string } };
    };
  };
};

export async function POST(req: Request) {
  let body: ConfirmBody;
  try {
    body = (await req.json()) as ConfirmBody;
  } catch {
    return NextResponse.json(
      { message: { ack: { status: "NACK" } }, error: { code: "VALIDATION", message: "Invalid JSON body" } },
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const ctx = body.context ?? {};
  const order = body.message?.order;
  const providerId = order?.provider?.id;
  const itemId = order?.items?.[0]?.id;
  const gps = order?.fulfillment?.end?.location?.gps;
  const scheduledTs = order?.fulfillment?.end?.time?.timestamp;
  const priceStr = order?.quote?.price?.value;
  const txnId = ctx.transaction_id;

  if (!providerId || !txnId) {
    return NextResponse.json(
      { message: { ack: { status: "NACK" } }, error: { code: "VALIDATION", message: "Missing provider or transaction_id" } },
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const provider = await db.query.providers.findFirst({ where: eq(providers.userId, providerId) });
  if (!provider) {
    return NextResponse.json(
      { message: { ack: { status: "NACK" } }, error: { code: "NOT_FOUND", message: "Provider not found" } },
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  let lat = provider.lat;
  let lng = provider.lng;
  if (typeof gps === "string") {
    const [latS, lngS] = gps.split(",").map((s) => s.trim());
    const pLat = Number(latS);
    const pLng = Number(lngS);
    if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
      lat = pLat;
      lng = pLng;
    }
  }
  const scheduledAt = scheduledTs ? new Date(scheduledTs) : new Date(Date.now() + 60 * 60 * 1000);
  const priceQuoted = priceStr ? Math.round(Number(priceStr)) : provider.hourlyRateMin;

  const customerUserId = providerId;
  const service = itemId ? await db.query.services.findFirst({ where: eq(services.id, itemId) }) : null;

  const inserted = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(bookings)
      .values({
        userId: customerUserId,
        providerId,
        serviceId: service?.id ?? null,
        scheduledAt,
        address: order?.fulfillment?.end?.location?.address?.name ?? "ONDC order",
        lat,
        lng,
        notes: `ONDC order via ${ctx.bap_id ?? "unknown BAP"}`,
        priceQuoted,
        status: "pending",
        paymentStatus: order?.payment?.params?.transaction_id ? "initiated" : "unpaid",
        ondcTransactionId: txnId,
      })
      .returning();

    await tx.insert(auditLog).values({
      action: "ONDC_CONFIRM",
      entity: "bookings",
      entityId: row?.id,
      metadata: JSON.stringify({ txnId, bapId: ctx.bap_id, providerId }).slice(0, 4000),
    });

    return row;
  });

  const onConfirmCtx = newBecknContext({
    action: "on_confirm",
    transaction_id: txnId,
    message_id: ctx.message_id ?? newBecknContext({ action: "on_confirm" }).message_id,
    bap_id: ctx.bap_id ?? "external.bap",
    bap_uri: ctx.bap_uri ?? "https://bap.example.com",
  });

  return NextResponse.json(
    {
      context: onConfirmCtx,
      message: {
        order: {
          id: inserted?.id,
          state: "Created",
          provider: { id: providerId },
          items: itemId ? [{ id: itemId, quantity: { count: 1 } }] : [],
          quote: { price: { currency: "INR", value: priceQuoted.toFixed(2) } },
          fulfillment: { state: { descriptor: { code: "Pending" } } },
          payment: { status: inserted?.paymentStatus === "paid" ? "PAID" : "NOT-PAID" },
        },
      },
    },
    { headers: { "Content-Type": "application/json" } },
  );
}
