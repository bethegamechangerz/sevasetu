import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { type BecknContext, newBecknContext } from "@/lib/ondc/adapter";

export const runtime = "nodejs";

type StatusBody = {
  context?: Partial<BecknContext>;
  message?: { order_id?: string };
};

const STATE_MAP: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  in_progress: "In-progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Cancelled",
};

export async function POST(req: Request) {
  let body: StatusBody;
  try {
    body = (await req.json()) as StatusBody;
  } catch {
    return NextResponse.json(
      { message: { ack: { status: "NACK" } }, error: { code: "VALIDATION", message: "Invalid JSON body" } },
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const ctx = body.context ?? {};
  const txnId = ctx.transaction_id;
  if (!txnId) {
    return NextResponse.json(
      { message: { ack: { status: "NACK" } }, error: { code: "VALIDATION", message: "Missing transaction_id" } },
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const booking = await db.query.bookings.findFirst({ where: eq(bookings.ondcTransactionId, txnId) });
  if (!booking) {
    return NextResponse.json(
      { message: { ack: { status: "NACK" } }, error: { code: "NOT_FOUND", message: "Booking not found" } },
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  const onStatusCtx = newBecknContext({
    action: "on_status",
    transaction_id: txnId,
    message_id: ctx.message_id ?? newBecknContext({ action: "on_status" }).message_id,
    bap_id: ctx.bap_id ?? "external.bap",
    bap_uri: ctx.bap_uri ?? "https://bap.example.com",
  });

  return NextResponse.json(
    {
      context: onStatusCtx,
      message: {
        order: {
          id: booking.id,
          state: STATE_MAP[booking.status] ?? booking.status,
          provider: { id: booking.providerId },
          quote: { price: { currency: "INR", value: booking.priceQuoted.toFixed(2) } },
          fulfillment: { state: { descriptor: { code: STATE_MAP[booking.status] ?? booking.status } } },
          payment: { status: booking.paymentStatus === "paid" ? "PAID" : "NOT-PAID" },
        },
      },
    },
    { headers: { "Content-Type": "application/json" } },
  );
}
