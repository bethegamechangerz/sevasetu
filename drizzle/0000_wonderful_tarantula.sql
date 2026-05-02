CREATE TYPE "public"."booking_status" AS ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('unverified', 'pending', 'verified', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'initiated', 'paid', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."price_unit" AS ENUM('per_visit', 'per_hour', 'per_day', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'provider', 'admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"password" text,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"id_token" text,
	"scope" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" varchar(64) NOT NULL,
	"entity" varchar(64) NOT NULL,
	"entity_id" varchar(64),
	"metadata" text,
	"ip" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"service_id" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"address" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"notes" text,
	"price_quoted" integer NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"upi_txn_ref" varchar(64),
	"ondc_transaction_id" varchar(64),
	"cancelled_reason" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"slug" varchar(64) PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text NOT NULL,
	"icon" varchar(64) NOT NULL,
	"ondc_code" varchar(32) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_provider_id_pk" PRIMARY KEY("user_id","provider_id")
);
--> statement-breakpoint
CREATE TABLE "provider_categories" (
	"provider_id" text NOT NULL,
	"category_slug" varchar(64) NOT NULL,
	CONSTRAINT "provider_categories_provider_id_category_slug_pk" PRIMARY KEY("provider_id","category_slug")
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"user_id" text PRIMARY KEY NOT NULL,
	"headline" text NOT NULL,
	"bio" text NOT NULL,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"hourly_rate_min" integer NOT NULL,
	"hourly_rate_max" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"address" text NOT NULL,
	"city" varchar(80) NOT NULL,
	"state" varchar(80) NOT NULL,
	"pincode" varchar(6) NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"is_accepting_bookings" boolean DEFAULT true NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"upi_vpa" varchar(255),
	"aadhaar_last4" varchar(4),
	"aadhaar_hash" text,
	"aadhaar_verified_at" timestamp with time zone,
	"aadhaar_status" "kyc_status" DEFAULT 'unverified' NOT NULL,
	"pan_number" varchar(10),
	"pan_status" "kyc_status" DEFAULT 'unverified' NOT NULL,
	"gstin" varchar(15),
	"gstin_status" "kyc_status" DEFAULT 'unverified' NOT NULL,
	"ondc_participant_id" varchar(255),
	"ondc_subscribed_at" timestamp with time zone,
	"rating_avg" real DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"completed_bookings" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_likes" (
	"review_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_likes_review_id_user_id_pk" PRIMARY KEY("review_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"booking_id" text,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"category_slug" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"price_unit" "price_unit" DEFAULT 'per_visit' NOT NULL,
	"duration_minutes" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"phone" varchar(16),
	"phone_verified" boolean DEFAULT false NOT NULL,
	"locale" varchar(4) DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_provider_id_providers_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_provider_id_providers_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_categories" ADD CONSTRAINT "provider_categories_provider_id_providers_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_categories" ADD CONSTRAINT "provider_categories_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_likes" ADD CONSTRAINT "review_likes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_likes" ADD CONSTRAINT "review_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_provider_id_providers_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_provider_id_providers_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "bookings_user_idx" ON "bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookings_provider_idx" ON "bookings" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_scheduled_idx" ON "bookings" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "pc_category_idx" ON "provider_categories" USING btree ("category_slug");--> statement-breakpoint
CREATE INDEX "providers_city_idx" ON "providers" USING btree ("city");--> statement-breakpoint
CREATE INDEX "providers_pincode_idx" ON "providers" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "providers_geo_idx" ON "providers" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "providers_rating_idx" ON "providers" USING btree ("rating_avg");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_provider_reviewer_unique" ON "reviews" USING btree ("provider_id","reviewer_id");--> statement-breakpoint
CREATE INDEX "reviews_provider_idx" ON "reviews" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "services_provider_idx" ON "services" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "services_category_idx" ON "services" USING btree ("category_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");