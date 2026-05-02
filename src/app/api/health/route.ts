import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  let dbStatus: "up" | "down" = "down";
  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = "up";
  } catch {
    dbStatus = "down";
  }
  return NextResponse.json({
    status: dbStatus === "up" ? "ok" : "degraded",
    time: new Date().toISOString(),
    db: dbStatus,
  });
}
