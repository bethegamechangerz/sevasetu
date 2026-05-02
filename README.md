# SevaSetu — सेवा सेतु

**Trusted local services. Verified. Nearby.**

A production-grade local services marketplace for India: customers find verified electricians, plumbers, tutors, cooks, drivers and more — book in minutes, pay by UPI, backed by Aadhaar/PAN verification and discoverable on the ONDC network.

> B.Tech CSE final-semester capstone project. Author: **Abhay Chandel**.

---

## What's inside

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript strict + Tailwind CSS v4 + shadcn-style UI primitives + Lucide icons
- **Backend**: Next.js Route Handlers + Server Actions
- **Database**: PostgreSQL 17 + Drizzle ORM (migrations, seed)
- **Auth**: Better-Auth (email + password, sessions, role-based access — customer / provider / admin)
- **Maps**: OpenStreetMap + Leaflet/React-Leaflet (no Google Maps key required)
- **i18n**: English + हिन्दी (Hindi)
- **Theme**: Light / Dark / System (CSS variables, `next-themes`)
- **Payments**: UPI deeplinks (BHIM/GPay/PhonePe/Paytm) + simulated NPCI collect/settle for the demo
- **Government verification (simulated, transparently)**:
  - **Aadhaar** — real Verhoeff checksum + OTP send/verify flow shaped like UIDAI's API. (Real UIDAI integration requires a KUA/AUA license; we simulate the wire format.)
  - **PAN** — real format check (incl. entity-type detection from 4th char) + simulated NSDL/Protean verification.
  - **GSTIN** — real format + checksum (the same Mod-36 algorithm GSTN uses) + simulated GSTN lookup.
  - **DigiLocker** — simulated e-KYC payload shape on successful Aadhaar verify.
- **ONDC**: Simulated **BPP** for Beckn 1.1 / RET11 (Services). `/api/ondc/{search,select,init,confirm,status,on_search,registry}` mirror the real ONDC contract; SevaSetu providers are auto-subscribed with a `participantId`.

Every simulated integration carries a visible "Demo verification" banner in the UI so users are never misled.

---

## Quick start

### Prerequisites
- Node.js ≥ 20
- Docker (for the local Postgres) — or any Postgres 14+ you want to point at via `DATABASE_URL`
- ~1 GB free disk

### 1. Install
```bash
npm install
```

### 2. Configure env
```bash
cp .env.example .env.local
# generate a secret:
openssl rand -base64 32   # paste into BETTER_AUTH_SECRET
```

### 3. Start Postgres
```bash
docker compose up -d db
```

### 4. Push schema + seed
```bash
npm run db:push     # pushes Drizzle schema to Postgres (no migration files needed for dev)
npm run db:seed     # seeds 60 providers across 12 cities + categories + reviews
```

### 5. Run
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo accounts** (after seed):
- Customer: `demo@sevasetu.in` / `password123`
- Providers: `provider0@sevasetu.in` … `provider59@sevasetu.in` / `password123`

---

## Production deploy (Docker)

```bash
docker compose up -d --build
```

The compose file ships an app container (`Dockerfile` builds Next.js standalone) wired to the `db` container.

For a managed Postgres (Supabase, Neon, RDS), point `DATABASE_URL` to it, drop the `db` service, and you're good.

---

## Project layout

```
src/
├── app/
│   ├── (auth)/            # /login, /signup
│   ├── (app)/             # authenticated shell + browse, providers/[id], dashboard, bookings, settings, provider/*
│   ├── api/               # auth, search, providers, services, reviews, bookings, kyc, upi, ondc, health
│   ├── layout.tsx
│   ├── page.tsx           # landing
│   └── globals.css        # Tailwind v4 + theme tokens
├── components/
│   ├── ui/                # shadcn-style primitives (Button, Card, Dialog, …)
│   ├── layout/            # Header, Footer, ThemeToggle, LocaleToggle
│   ├── map/               # Leaflet wrappers (dynamic-loaded, ssr:false)
│   ├── kyc/               # Aadhaar/PAN/GST simulated flows
│   ├── provider/, customer/, settings/, services/, auth/
│   ├── provider-card.tsx, review-form.tsx, review-list.tsx, booking-modal.tsx,
│   ├── search-bar.tsx, category-grid.tsx, star-rating.tsx, upi-payment-card.tsx
│   └── theme-provider.tsx
├── lib/
│   ├── db/                # schema.ts, index.ts, migrate.ts
│   ├── kyc/               # aadhaar.ts (Verhoeff), pan.ts, gst.ts (Mod-36)
│   ├── payments/          # upi.ts (deeplink + collect/settle simulator)
│   ├── ondc/              # adapter.ts (Beckn 1.1 contexts, registry, on_search builder)
│   ├── auth.ts, auth-client.ts, auth-helpers.ts
│   ├── validators.ts, categories.ts, i18n.ts, geo.ts, utils.ts, env.ts
│   └── …
├── middleware.ts          # gate /dashboard, /bookings, /settings, /provider
└── …
scripts/
├── seed.ts                # 60 providers in 12 cities, categories, reviews
└── reset.ts               # drop+recreate public schema
```

---

## Architecture notes

### Data model
Users + Better-Auth tables (`sessions`, `accounts`, `verifications`) → `providers` (one-to-one extension when role=provider) → many-to-many `provider_categories` → many `services`, `reviews`, `bookings`, `favorites`. An `audit_log` table records sensitive transitions.

### Auth + roles
Better-Auth with email/password. Role is stored on the `users` row (`customer | provider | admin`). Middleware gates protected paths by cookie presence; **authoritative role checks always happen server-side** in pages via `requireRole()`.

### Geo search
Bounding-box (`minLat/maxLat/minLng/maxLng`) + Drizzle filters in the browse query, then in-process `haversineKm()` for accurate distance. Plenty fast at city-scale; swap to PostGIS `<->` operator later for nationwide scale.

### Maps
React-Leaflet with OpenStreetMap tiles. Map is **dynamic-imported with `ssr: false`** to avoid hydration mismatches. Custom div-icon markers prevent the well-known broken default-icon bug under bundlers.

### Government verifications
Real algorithm checks where they exist (Verhoeff for Aadhaar, Mod-36 for GSTIN, regex+entity-byte for PAN). Network calls are simulated — every UI surface that performs simulation says so explicitly. Switching `AADHAAR_MODE=disabled` removes the demo flow entirely.

### ONDC
SevaSetu acts as a **BPP** (Beckn Provider Platform) for `ONDC:RET11` services. Beckn 1.1 contexts are constructed correctly; `on_search` returns a real catalog built from local providers. Cryptographic signing is simulated (real ONDC requires Ed25519 keys + registry whitelisting). The contract surface is real so a registered keypair can be plugged in by replacing `src/lib/ondc/adapter.ts`.

### UPI
Standard NPCI BHIM `upi://pay?…` deeplinks (no PSP onboarding needed for the *intent* flow — opens GPay/PhonePe/Paytm/BHIM directly). Server-side collect/settle is simulated.

### i18n
Tiny dictionary in `src/lib/i18n.ts`; locale resolved from cookie (`sevasetu_locale`) → Accept-Language → default `en`. Hindi uses Devanagari with a `Noto Sans Devanagari` fallback. RTL not needed for Hindi but the layout works for it.

### Performance
- RSC by default; client components only where state/effects are needed.
- Streaming + `loading.tsx`. Skeletons in lists.
- Images via `next/image` with AVIF/WebP, remote OSM/Unsplash hosts allowlisted.
- Edge-cacheable headers + HSTS/X-Frame-Options/CSP-friendly headers in `next.config.ts`.

### Security
- Argon2 password hashing via Better-Auth.
- Aadhaar stored as `last4` only + salted SHA-256 hash for de-dup; never plaintext.
- Zod validation on every API boundary.
- Server-derived `userId` — never trusted from caller.
- `audit_log` for KYC, booking transitions, provider creation.

### Privacy / DPDP
- Minimum data collection; explicit consent at provider onboarding.
- PII never logged or surfaced in URLs.
- "Download my data" + "Delete account" wired into Settings (deletion is `ON DELETE CASCADE` across the schema).

---

## Scripts
| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build (standalone) |
| `npm run start` | Run the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` | Push Drizzle schema to DB (dev) |
| `npm run db:generate` | Generate SQL migrations under `drizzle/` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Drop + recreate `public` schema |
| `npm run db:studio` | Open Drizzle Studio |

---

## What I'd build next
- WebSocket-based provider availability + live booking notifications
- ONDC issue/raise/refund flows (`igm` Beckn API)
- DigiLocker real OAuth integration (Meri Pehchaan)
- Cashfree / Razorpay PSP for real UPI collect with webhook reconciliation
- Hindi search synonym expansion + regional language support (Tamil, Bengali, Marathi)
- PWA with offline booking queue (writes synced when network returns)

---

## License
MIT © 2026 Abhay Chandel
