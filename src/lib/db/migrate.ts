/**
 * Stand-alone migration runner. The Cloud Run runtime applies migrations
 * automatically at module load via db/index.ts; this script exists so a
 * developer can apply migrations against a one-off PGlite session locally.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { pglite } = await import("./index");
  const { applySchemaSql } = await import("./bootstrap");
  console.log("Running migrations…");
  await applySchemaSql(pglite);
  console.log("Migrations complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
