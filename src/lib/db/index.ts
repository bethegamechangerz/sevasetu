/**
 * In-process PGlite (Postgres compiled to WASM) database client.
 *
 * Data is volatile — it lives only for the lifetime of the Node process.
 * Cloud Run scales the container to zero when idle and re-seeds on the next
 * cold start. That is exactly the demo behaviour we want.
 *
 * The schema is full PostgreSQL — pgEnum, doublePrecision, timestamps with
 * timezone, foreign keys, indexes — and runs unchanged.
 *
 * Schema apply + idempotent seed run at module load via top-level await, so
 * the first import (server start) blocks until the database is ready.
 */
import "server-only";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __pglite?: PGlite;
  __db?: ReturnType<typeof drizzle<typeof schema>>;
  __ready?: Promise<void>;
};

const pg = globalForDb.__pglite ?? new PGlite("memory://");
const drizzleDb = globalForDb.__db ?? drizzle(pg, { schema, logger: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pglite = pg;
  globalForDb.__db = drizzleDb;
}

export const pglite = pg;
export const db = drizzleDb;
export const queryClient = async (sqlStr: string) => pg.exec(sqlStr);
export { schema };

async function bootstrapOnce(): Promise<void> {
  // Apply migration SQL.
  const { applySchemaSql, ensureSeeded } = await import("./bootstrap");
  await applySchemaSql(pg);
  await ensureSeeded(drizzleDb, pg);
}

const ready = globalForDb.__ready ?? bootstrapOnce();
if (process.env.NODE_ENV !== "production") globalForDb.__ready = ready;
await ready;
