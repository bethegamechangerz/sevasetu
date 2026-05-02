import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { queryClient } from "../src/lib/db";

async function main() {
  console.log("Dropping schema…");
  await queryClient(`DROP SCHEMA IF EXISTS public CASCADE`);
  await queryClient(`CREATE SCHEMA public`);
  await queryClient(`GRANT ALL ON SCHEMA public TO public`);
  console.log("Schema reset. Run db:push and db:seed next.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
