/**
 * One-shot bootstrap for the in-process PGlite database.
 *
 * - applySchemaSql: applies all Drizzle migration SQL files under /drizzle.
 * - ensureSeeded:   inserts categories + demo customer + 60 providers (idempotent).
 *
 * Both run once per process via the top-level-await block in db/index.ts.
 *
 * All inserts go through PGlite's parameterised query API; no string-concat SQL.
 */
import "server-only";
import { readFile, readdir } from "fs/promises";
import path from "path";
import { createHash, randomBytes, scrypt as _scrypt } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { CATEGORIES } from "../categories";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

const scryptP = promisify(_scrypt) as (
  password: string,
  salt: string,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem?: number },
) => Promise<Buffer>;

async function hashPasswordLikeBetterAuth(password: string): Promise<string> {
  const saltHex = randomBytes(16).toString("hex");
  const key = await scryptP(password, saltHex, 64, { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 });
  return `${saltHex}:${key.toString("hex")}`;
}

let schemaApplied = false;
let seedingApplied = false;

export async function applySchemaSql(pg: PGlite): Promise<void> {
  if (schemaApplied) return;
  schemaApplied = true;

  const drizzleDir = path.resolve(process.cwd(), "drizzle");
  let entries: string[];
  try {
    entries = await readdir(drizzleDir);
  } catch {
    console.warn("[bootstrap] no drizzle/ directory; skipping schema apply");
    return;
  }
  const sqlFiles = entries.filter((f) => f.endsWith(".sql")).sort();
  for (const f of sqlFiles) {
    const sql = await readFile(path.join(drizzleDir, f), "utf-8");
    const statements = sql
      .split(/-->\s*statement-breakpoint/i)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      try {
        await pg.exec(stmt);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/already exists/i.test(msg)) continue;
        console.error("[bootstrap] schema apply failed for", f, msg);
        throw e;
      }
    }
  }
}

const cities: Array<{ city: string; state: string; pincode: string; lat: number; lng: number }> = [
  { city: "New Delhi", state: "Delhi", pincode: "110001", lat: 28.6139, lng: 77.209 },
  { city: "Gurugram", state: "Haryana", pincode: "122001", lat: 28.4595, lng: 77.0266 },
  { city: "Noida", state: "Uttar Pradesh", pincode: "201301", lat: 28.5355, lng: 77.391 },
  { city: "Mumbai", state: "Maharashtra", pincode: "400001", lat: 19.076, lng: 72.8777 },
  { city: "Pune", state: "Maharashtra", pincode: "411001", lat: 18.5204, lng: 73.8567 },
  { city: "Bengaluru", state: "Karnataka", pincode: "560001", lat: 12.9716, lng: 77.5946 },
  { city: "Hyderabad", state: "Telangana", pincode: "500001", lat: 17.385, lng: 78.4867 },
  { city: "Chennai", state: "Tamil Nadu", pincode: "600001", lat: 13.0827, lng: 80.2707 },
  { city: "Kolkata", state: "West Bengal", pincode: "700001", lat: 22.5726, lng: 88.3639 },
  { city: "Jaipur", state: "Rajasthan", pincode: "302001", lat: 26.9124, lng: 75.7873 },
  { city: "Lucknow", state: "Uttar Pradesh", pincode: "226001", lat: 26.8467, lng: 80.9462 },
  { city: "Chandigarh", state: "Chandigarh", pincode: "160001", lat: 30.7333, lng: 76.7794 },
];
const firstNames = ["Ravi","Amit","Suresh","Vikram","Rahul","Priya","Anjali","Pooja","Sneha","Kiran","Manoj","Sunita","Deepak","Asha","Rajesh","Meera","Sanjay","Neha","Arjun","Kavita","Mohan","Geeta","Vinod","Lakshmi"];
const lastNames = ["Sharma","Verma","Kumar","Singh","Patel","Iyer","Reddy","Khan","Das","Mishra","Gupta","Yadav","Joshi","Mehta","Shah","Nair"];
const reviewPool = [
  "Excellent work, very professional and on time.",
  "Quick response, fair pricing. Will book again.",
  "Polite and skilled. Solved the issue in one visit.",
  "Did a clean job, explained everything clearly.",
  "Good experience overall. Would recommend.",
  "Reached on time, finished quickly. Happy with the result.",
  "Knew exactly what was wrong and fixed it. Reasonable price.",
  "Thorough and patient. Took care of small details.",
  "Honest pricing, no upselling. Refreshing.",
  "Friendly and skilled. Highly recommend.",
];

const newId = () => randomBytes(12).toString("hex");
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;
const jitter = (v: number, by: number) => v + (Math.random() - 0.5) * by;

async function insertCredentialAccount(pg: PGlite, userId: string, passwordHash: string) {
  // Parameterised insert — no string-concat SQL.
  await pg.query(
    `INSERT INTO accounts (id, user_id, account_id, provider_id, password)
     VALUES ($1, $2, $3, 'credential', $4)
     ON CONFLICT DO NOTHING`,
    [newId(), userId, userId, passwordHash],
  );
}

export async function ensureSeeded(db: DrizzleDb, pg: PGlite): Promise<void> {
  if (seedingApplied) return;
  seedingApplied = true;

  const existing = await db.select().from(schema.categories).limit(1);
  if (existing.length > 0) return;

  await db.insert(schema.categories).values(
    CATEGORIES.map((c, i) => ({
      slug: c.slug,
      nameEn: c.nameEn,
      nameHi: c.nameHi,
      icon: c.icon,
      ondcCode: c.ondcCode,
      sortOrder: i,
    })),
  ).onConflictDoNothing();

  // Demo customer
  const customerPwd = await hashPasswordLikeBetterAuth("password123");
  const customerId = newId();
  await db.insert(schema.users).values({
    id: customerId,
    name: "Demo Customer",
    email: "demo@sevasetu.in",
    emailVerified: true,
    role: "customer",
    phone: "9876543210",
    phoneVerified: true,
    locale: "en",
  }).onConflictDoNothing();
  await insertCredentialAccount(pg, customerId, customerPwd);

  const reviewerIds: string[] = [customerId];
  for (let i = 0; i < 10; i++) {
    const uid = newId();
    await db.insert(schema.users).values({
      id: uid,
      name: `${pick(firstNames)} ${pick(lastNames)}`,
      email: `cust${i}@sevasetu.in`,
      emailVerified: true,
      role: "customer",
      phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
      phoneVerified: true,
      locale: Math.random() < 0.5 ? "en" : "hi",
    }).onConflictDoNothing();
    const pwd = await hashPasswordLikeBetterAuth("password123");
    await insertCredentialAccount(pg, uid, pwd);
    reviewerIds.push(uid);
  }

  const providerCount = 60;
  for (let i = 0; i < providerCount; i++) {
    const uid = newId();
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    const c = pick(cities);
    const cat = pick(CATEGORIES);
    const rateMin = ([200, 250, 300, 400, 500] as number[])[Math.floor(Math.random() * 5)] as number;
    const rateMax = rateMin + (([100, 200, 300, 500, 800] as number[])[Math.floor(Math.random() * 5)] as number);
    await db.insert(schema.users).values({
      id: uid,
      name,
      email: `provider${i}@sevasetu.in`,
      emailVerified: true,
      role: "provider",
      phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
      phoneVerified: true,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff`,
      locale: Math.random() < 0.5 ? "en" : "hi",
    }).onConflictDoNothing();
    const pwd = await hashPasswordLikeBetterAuth("password123");
    await insertCredentialAccount(pg, uid, pwd);

    const last4 = String(Math.floor(1000 + Math.random() * 9000));
    await db.insert(schema.providers).values({
      userId: uid,
      headline: `Experienced ${cat.nameEn} in ${c.city}`,
      bio: `${name} has been working as a ${cat.nameEn.toLowerCase()} in and around ${c.city} for several years. Known for honest pricing, on-time arrival, and quality work. Available for both same-day and scheduled visits.`,
      experienceYears: 1 + Math.floor(Math.random() * 18),
      hourlyRateMin: rateMin,
      hourlyRateMax: rateMax,
      currency: "INR",
      address: `${10 + Math.floor(Math.random() * 200)}, Main Road, ${c.city}`,
      city: c.city,
      state: c.state,
      pincode: c.pincode,
      lat: jitter(c.lat, 0.08),
      lng: jitter(c.lng, 0.08),
      isAcceptingBookings: true,
      isOnline: Math.random() < 0.4,
      upiVpa: `${name.toLowerCase().replace(/\s+/g, ".")}@upi`,
      aadhaarLast4: last4,
      aadhaarHash: createHash("sha256").update("seed:" + uid).digest("hex"),
      aadhaarVerifiedAt: new Date(),
      aadhaarStatus: "verified",
      panStatus: Math.random() < 0.7 ? "verified" : "unverified",
      ondcParticipantId: `${uid.slice(0, 8)}.bpp.sevasetu`,
      ondcSubscribedAt: new Date(),
    }).onConflictDoNothing();

    await db.insert(schema.providerCategories).values({ providerId: uid, categorySlug: cat.slug }).onConflictDoNothing();

    const svcCount = 1 + Math.floor(Math.random() * 3);
    for (let s = 0; s < svcCount; s++) {
      await db.insert(schema.services).values({
        providerId: uid,
        categorySlug: cat.slug,
        title: `${cat.nameEn} - ${(["Basic visit", "Standard service", "Premium service", "Emergency call"] as const)[s % 4]!}`,
        description: `Professional ${cat.nameEn.toLowerCase()} service. Includes inspection, work, and a 7-day workmanship guarantee.`,
        price: rateMin + s * 200,
        priceUnit: pick(["per_visit", "per_hour", "fixed"] as const),
        durationMinutes: ([30, 60, 90, 120] as number[])[s % 4]!,
        isActive: true,
      });
    }

    const reviewCount = Math.floor(Math.random() * 12);
    let sum = 0;
    let actualReviews = 0;
    const usedReviewers = new Set<string>();
    for (let r = 0; r < reviewCount; r++) {
      const reviewer = pick(reviewerIds);
      if (usedReviewers.has(reviewer)) continue;
      usedReviewers.add(reviewer);
      const rating = Math.random() < 0.7 ? 5 : Math.random() < 0.7 ? 4 : 3;
      sum += rating;
      actualReviews++;
      await db.insert(schema.reviews).values({
        providerId: uid,
        reviewerId: reviewer,
        rating,
        comment: pick(reviewPool),
      }).onConflictDoNothing();
    }
    if (actualReviews > 0) {
      const avg = sum / actualReviews;
      await db.update(schema.providers).set({ ratingAvg: avg, ratingCount: actualReviews }).where(eq(schema.providers.userId, uid));
    }
  }

  console.log(`[bootstrap] seeded ${providerCount} providers across ${cities.length} cities`);
}
