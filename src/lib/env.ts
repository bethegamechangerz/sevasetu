import { z } from "zod";

const ServerSchema = z.object({
  // Empty / "memory://" / "pglite://..." selects the in-process PGlite database.
  DATABASE_URL: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AADHAAR_MODE: z.enum(["demo", "disabled"]).default("demo"),
});

const PublicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("SevaSetu"),
  NEXT_PUBLIC_TILE_URL: z.string().default("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
  NEXT_PUBLIC_TILE_ATTRIBUTION: z.string().default("© OpenStreetMap contributors"),
  NEXT_PUBLIC_DEFAULT_LAT: z.coerce.number().default(28.6139),
  NEXT_PUBLIC_DEFAULT_LNG: z.coerce.number().default(77.209),
  NEXT_PUBLIC_DEFAULT_CITY: z.string().default("New Delhi"),
});

type ServerEnv = z.infer<typeof ServerSchema>;
type PublicEnv = z.infer<typeof PublicSchema>;

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

let cachedServer: ServerEnv | undefined;

function readServerEnv(): ServerEnv {
  if (cachedServer) return cachedServer;
  const parsed = ServerSchema.safeParse(process.env);
  if (!parsed.success) {
    if (isBuildPhase) {
      // During next build, we may not have all secrets set. Return safe defaults
      // so static analysis / page-data collection can complete; runtime requests
      // will re-read and reject if BETTER_AUTH_SECRET is still absent.
      cachedServer = {
        DATABASE_URL: process.env.DATABASE_URL,
        BETTER_AUTH_SECRET: "build-phase-placeholder-not-used-at-runtime-xxx",
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
        NODE_ENV: (process.env.NODE_ENV as ServerEnv["NODE_ENV"]) ?? "production",
        AADHAAR_MODE: "demo",
      };
      return cachedServer;
    }
    const issues = parsed.error.flatten().fieldErrors;
    throw new Error("Invalid server environment variables: " + JSON.stringify(issues));
  }
  cachedServer = parsed.data;
  return cachedServer;
}

let cachedPublic: PublicEnv | undefined;
function readPublicEnv(): PublicEnv {
  if (cachedPublic) return cachedPublic;
  const parsed = PublicSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_TILE_URL: process.env.NEXT_PUBLIC_TILE_URL,
    NEXT_PUBLIC_TILE_ATTRIBUTION: process.env.NEXT_PUBLIC_TILE_ATTRIBUTION,
    NEXT_PUBLIC_DEFAULT_LAT: process.env.NEXT_PUBLIC_DEFAULT_LAT,
    NEXT_PUBLIC_DEFAULT_LNG: process.env.NEXT_PUBLIC_DEFAULT_LNG,
    NEXT_PUBLIC_DEFAULT_CITY: process.env.NEXT_PUBLIC_DEFAULT_CITY,
  });
  if (!parsed.success) {
    throw new Error("Invalid public env: " + JSON.stringify(parsed.error.flatten().fieldErrors));
  }
  cachedPublic = parsed.data;
  return cachedPublic;
}

export const serverEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: keyof ServerEnv) {
    if (typeof window !== "undefined") return undefined as never;
    return readServerEnv()[prop];
  },
});

export const publicEnv = readPublicEnv();
