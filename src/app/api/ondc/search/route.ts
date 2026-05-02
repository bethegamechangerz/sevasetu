import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: { ack: { status: "NACK" } }, error: { code: "VALIDATION", message: "Invalid JSON body" } },
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const ctx = (body as { context?: { transaction_id?: string; message_id?: string } } | null)?.context ?? {};

  await db.insert(auditLog).values({
    action: "ONDC_SEARCH",
    entity: "ondc",
    entityId: ctx.transaction_id ?? null,
    metadata: JSON.stringify({ messageId: ctx.message_id, intent: (body as { message?: unknown } | null)?.message }).slice(0, 4000),
  });

  return NextResponse.json(
    { message: { ack: { status: "ACK" } } },
    { headers: { "Content-Type": "application/json" } },
  );
}
