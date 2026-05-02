import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// -------------------- Enums --------------------
export const userRole = pgEnum("user_role", ["customer", "provider", "admin"]);
export const bookingStatus = pgEnum("booking_status", [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);
export const priceUnit = pgEnum("price_unit", ["per_visit", "per_hour", "per_day", "fixed"]);
export const kycStatus = pgEnum("kyc_status", ["unverified", "pending", "verified", "failed"]);
export const paymentStatus = pgEnum("payment_status", ["unpaid", "initiated", "paid", "refunded", "failed"]);

// -------------------- Better-Auth core tables --------------------
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: userRole("role").notNull().default("customer"),
    phone: varchar("phone", { length: 16 }),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    locale: varchar("locale", { length: 4 }).notNull().default("en"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email), index("users_role_idx").on(t.role)],
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  password: text("password"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  idToken: text("id_token"),
  scope: text("scope"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// -------------------- Providers --------------------
export const providers = pgTable(
  "providers",
  {
    userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    headline: text("headline").notNull(),
    bio: text("bio").notNull(),
    experienceYears: integer("experience_years").notNull().default(0),
    hourlyRateMin: integer("hourly_rate_min").notNull(),
    hourlyRateMax: integer("hourly_rate_max").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    address: text("address").notNull(),
    city: varchar("city", { length: 80 }).notNull(),
    state: varchar("state", { length: 80 }).notNull(),
    pincode: varchar("pincode", { length: 6 }).notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    isAcceptingBookings: boolean("is_accepting_bookings").notNull().default(true),
    isOnline: boolean("is_online").notNull().default(false),
    upiVpa: varchar("upi_vpa", { length: 255 }),
    aadhaarLast4: varchar("aadhaar_last4", { length: 4 }),
    aadhaarHash: text("aadhaar_hash"),
    aadhaarVerifiedAt: timestamp("aadhaar_verified_at", { withTimezone: true }),
    aadhaarStatus: kycStatus("aadhaar_status").notNull().default("unverified"),
    panNumber: varchar("pan_number", { length: 10 }),
    panStatus: kycStatus("pan_status").notNull().default("unverified"),
    gstin: varchar("gstin", { length: 15 }),
    gstinStatus: kycStatus("gstin_status").notNull().default("unverified"),
    ondcParticipantId: varchar("ondc_participant_id", { length: 255 }),
    ondcSubscribedAt: timestamp("ondc_subscribed_at", { withTimezone: true }),
    ratingAvg: real("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    completedBookings: integer("completed_bookings").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("providers_city_idx").on(t.city),
    index("providers_pincode_idx").on(t.pincode),
    index("providers_geo_idx").on(t.lat, t.lng),
    index("providers_rating_idx").on(t.ratingAvg),
  ],
);

// -------------------- Categories --------------------
export const categories = pgTable("categories", {
  slug: varchar("slug", { length: 64 }).primaryKey(),
  nameEn: text("name_en").notNull(),
  nameHi: text("name_hi").notNull(),
  icon: varchar("icon", { length: 64 }).notNull(),
  ondcCode: varchar("ondc_code", { length: 32 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const providerCategories = pgTable(
  "provider_categories",
  {
    providerId: text("provider_id").notNull().references(() => providers.userId, { onDelete: "cascade" }),
    categorySlug: varchar("category_slug", { length: 64 }).notNull().references(() => categories.slug, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.providerId, t.categorySlug] }), index("pc_category_idx").on(t.categorySlug)],
);

// -------------------- Services (provider-listed offerings) --------------------
export const services = pgTable(
  "services",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    providerId: text("provider_id").notNull().references(() => providers.userId, { onDelete: "cascade" }),
    categorySlug: varchar("category_slug", { length: 64 }).notNull().references(() => categories.slug),
    title: text("title").notNull(),
    description: text("description").notNull(),
    price: integer("price").notNull(),
    priceUnit: priceUnit("price_unit").notNull().default("per_visit"),
    durationMinutes: integer("duration_minutes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("services_provider_idx").on(t.providerId), index("services_category_idx").on(t.categorySlug)],
);

// -------------------- Reviews --------------------
export const reviews = pgTable(
  "reviews",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    providerId: text("provider_id").notNull().references(() => providers.userId, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    bookingId: text("booking_id"),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    likeCount: integer("like_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reviews_provider_reviewer_unique").on(t.providerId, t.reviewerId),
    index("reviews_provider_idx").on(t.providerId),
  ],
);

export const reviewLikes = pgTable(
  "review_likes",
  {
    reviewId: text("review_id").notNull().references(() => reviews.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.reviewId, t.userId] })],
);

// -------------------- Bookings --------------------
export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    providerId: text("provider_id").notNull().references(() => providers.userId, { onDelete: "restrict" }),
    serviceId: text("service_id").references(() => services.id, { onDelete: "set null" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    address: text("address").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    notes: text("notes"),
    priceQuoted: integer("price_quoted").notNull(),
    status: bookingStatus("status").notNull().default("pending"),
    paymentStatus: paymentStatus("payment_status").notNull().default("unpaid"),
    upiTxnRef: varchar("upi_txn_ref", { length: 64 }),
    ondcTransactionId: varchar("ondc_transaction_id", { length: 64 }),
    cancelledReason: text("cancelled_reason"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bookings_user_idx").on(t.userId),
    index("bookings_provider_idx").on(t.providerId),
    index("bookings_status_idx").on(t.status),
    index("bookings_scheduled_idx").on(t.scheduledAt),
  ],
);

// -------------------- Favorites --------------------
export const favorites = pgTable(
  "favorites",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull().references(() => providers.userId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.providerId] })],
);

// -------------------- Audit log --------------------
export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    actorId: text("actor_id"),
    action: varchar("action", { length: 64 }).notNull(),
    entity: varchar("entity", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    metadata: text("metadata"),
    ip: varchar("ip", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_actor_idx").on(t.actorId), index("audit_entity_idx").on(t.entity, t.entityId)],
);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
