/**
 * Standalone seeder. The Cloud Run runtime auto-seeds on cold start; this
 * script exists for local dev only and just imports the same bootstrap path.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { db, pglite } = await import("../src/lib/db");
  const { applySchemaSql, ensureSeeded } = await import("../src/lib/db/bootstrap");
  await applySchemaSql(pglite);
  await ensureSeeded(db, pglite);
  console.log("Seed done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
