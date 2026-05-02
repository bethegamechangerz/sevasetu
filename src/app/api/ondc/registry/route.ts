import { NextResponse } from "next/server";
import { simulateRegistryLookup } from "@/lib/ondc/adapter";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "id query parameter is required" } },
      { status: 400 },
    );
  }
  const record = simulateRegistryLookup(id);
  return NextResponse.json(record, { headers: { "Content-Type": "application/json" } });
}
