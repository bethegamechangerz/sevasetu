/**
 * Zod schemas used across server actions and API routes.
 */
import { z } from "zod";
import { CATEGORY_SLUGS } from "./categories";

const PHONE_REGEX = /^[6-9]\d{9}$/; // Indian mobile, 10 digits, starts 6-9
const PINCODE_REGEX = /^[1-9]\d{5}$/;

export const PhoneSchema = z
  .string()
  .transform((s) => s.replace(/\D/g, "").replace(/^91/, "").slice(-10))
  .refine((s) => PHONE_REGEX.test(s), { message: "Enter a valid 10-digit Indian mobile number" });

export const PincodeSchema = z.string().regex(PINCODE_REGEX, "Enter a valid 6-digit pincode");

export const SignupSchema = z
  .object({
    name: z.string().min(2, "Name is too short").max(120),
    email: z.string().email(),
    password: z.string().min(8, "Use at least 8 characters").max(128),
    role: z.enum(["customer", "provider"]).default("customer"),
    phone: PhoneSchema,
  })
  .strict();

export const LoginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export const ProviderOnboardingSchema = z
  .object({
    headline: z.string().min(5).max(120),
    bio: z.string().min(20).max(2000),
    experienceYears: z.coerce.number().int().min(0).max(60),
    hourlyRateMin: z.coerce.number().int().min(50).max(100000),
    hourlyRateMax: z.coerce.number().int().min(50).max(100000),
    address: z.string().min(5).max(300),
    city: z.string().min(2).max(80),
    state: z.string().min(2).max(80),
    pincode: PincodeSchema,
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    upiVpa: z.string().min(5).max(255).optional().or(z.literal("")),
    categories: z.array(z.enum(CATEGORY_SLUGS as [string, ...string[]])).min(1).max(5),
  })
  .refine((d) => d.hourlyRateMax >= d.hourlyRateMin, {
    message: "Max rate must be at least min rate",
    path: ["hourlyRateMax"],
  });

export const ServiceSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  categorySlug: z.enum(CATEGORY_SLUGS as [string, ...string[]]),
  price: z.coerce.number().int().min(50).max(1_000_000),
  priceUnit: z.enum(["per_visit", "per_hour", "per_day", "fixed"]),
  durationMinutes: z.coerce.number().int().min(15).max(60 * 24).optional(),
  isActive: z.coerce.boolean().default(true),
});

export const ReviewSchema = z.object({
  providerId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(5).max(2000),
});

export const BookingSchema = z.object({
  providerId: z.string().min(1),
  serviceId: z.string().min(1).optional(),
  scheduledAt: z.coerce.date(),
  address: z.string().min(5).max(500),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  notes: z.string().max(1000).optional(),
  priceQuoted: z.coerce.number().int().min(0).max(1_000_000),
});

export const SearchSchema = z.object({
  q: z.string().max(200).optional(),
  category: z.enum(CATEGORY_SLUGS as [string, ...string[]]).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(100).default(15),
  minRating: z.coerce.number().min(1).max(5).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  online: z
    .union([z.literal("1"), z.literal("0"), z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === "1" || v === "true" ? true : v === "0" || v === "false" ? false : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type SearchParams = z.infer<typeof SearchSchema>;

export const AadhaarSendOtpSchema = z.object({
  aadhaar: z.string().transform((s) => s.replace(/\D/g, "")).pipe(z.string().length(12)),
});
export const AadhaarVerifyOtpSchema = z.object({
  txnId: z.string().min(1),
  otp: z.string().length(6),
  aadhaar: z.string().transform((s) => s.replace(/\D/g, "")).pipe(z.string().length(12)),
});
