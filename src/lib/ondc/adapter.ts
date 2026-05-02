/**
 * ONDC adapter - simulated.
 *
 * SevaSetu acts as a BPP (Beckn Provider Platform) for local services in this
 * capstone. Real ONDC participation needs whitelisting via ONDC registry +
 * cryptographic signing keys + L1 audit. We simulate the protocol shape so
 * the app's data model + handlers match the real Beckn/ONDC spec, and a real
 * registry can be plugged in by replacing this adapter.
 *
 * Spec reference: ONDC Retail Services (RET11) and Beckn 1.1 Discovery flows
 * (search/select/init/confirm/status/track/cancel/update).
 */
import { createHash, randomBytes } from "crypto";

export type BecknContext = {
  domain: string; // "ONDC:RET11"
  country: string; // "IND"
  city: string; // std:080 etc.
  action: BecknAction;
  core_version: "1.1.0";
  bap_id: string;
  bap_uri: string;
  bpp_id: string;
  bpp_uri: string;
  transaction_id: string;
  message_id: string;
  timestamp: string;
  ttl: string;
};

export type BecknAction =
  | "search"
  | "on_search"
  | "select"
  | "on_select"
  | "init"
  | "on_init"
  | "confirm"
  | "on_confirm"
  | "status"
  | "on_status"
  | "cancel"
  | "on_cancel"
  | "update"
  | "on_update";

export type BecknSearchIntent = {
  category?: { id: string };
  fulfillment?: { end?: { location: { gps: string } } };
  item?: { descriptor?: { name?: string } };
};

export const ONDC_DOMAIN_SERVICES = "ONDC:RET11";
export const SELF_BPP_ID = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "sevasetu.local";
export const SELF_BPP_URI = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function newBecknContext(overrides: Partial<BecknContext> & { action: BecknAction }): BecknContext {
  return {
    domain: ONDC_DOMAIN_SERVICES,
    country: "IND",
    city: "std:011",
    core_version: "1.1.0",
    bap_id: SELF_BPP_ID,
    bap_uri: SELF_BPP_URI,
    bpp_id: SELF_BPP_ID,
    bpp_uri: SELF_BPP_URI,
    transaction_id: randomBytes(8).toString("hex"),
    message_id: randomBytes(8).toString("hex"),
    timestamp: new Date().toISOString(),
    ttl: "PT30S",
    ...overrides,
  };
}

/**
 * Simulated ONDC registry lookup. Real ONDC registry is at registry.ondc.org.
 * This stand-in always returns a deterministic "registered" response so providers
 * appear ONDC-discoverable in the demo.
 */
export type OndcRegistryRecord = {
  participantId: string;
  type: "BPP";
  domain: string;
  status: "SUBSCRIBED";
  signingPublicKey: string; // base64
  encryptionPublicKey: string; // base64
  registeredAt: string;
};

export function simulateRegistryLookup(participantId: string): OndcRegistryRecord {
  return {
    participantId,
    type: "BPP",
    domain: ONDC_DOMAIN_SERVICES,
    status: "SUBSCRIBED",
    signingPublicKey: createHash("sha256").update("sign:" + participantId).digest("base64"),
    encryptionPublicKey: createHash("sha256").update("encr:" + participantId).digest("base64"),
    registeredAt: new Date().toISOString(),
  };
}

/**
 * Create a Beckn-style on_search catalog payload from local providers.
 * Used when an external BAP queries our /ondc/search endpoint.
 */
export function buildOnSearchCatalog(input: {
  ctx: BecknContext;
  providers: Array<{
    id: string;
    name: string;
    descriptor: string;
    locationGps: string; // "lat,lng"
    items: Array<{ id: string; name: string; description?: string; priceInr: number }>;
  }>;
}) {
  return {
    context: input.ctx,
    message: {
      catalog: {
        "bpp/descriptor": { name: "SevaSetu", short_desc: "Local services across India" },
        "bpp/providers": input.providers.map((p) => ({
          id: p.id,
          descriptor: { name: p.name, short_desc: p.descriptor },
          locations: [{ id: p.id + "-loc-1", gps: p.locationGps }],
          items: p.items.map((it) => ({
            id: it.id,
            descriptor: { name: it.name, short_desc: it.description ?? "" },
            price: { currency: "INR", value: it.priceInr.toFixed(2) },
            location_ids: [p.id + "-loc-1"],
            "@ondc/org/returnable": false,
            "@ondc/org/cancellable": true,
          })),
        })),
      },
    },
  };
}

/**
 * Simulated digital signature - mimics Beckn Auth header format.
 * Real implementation uses Ed25519 over a digest of created+expires+digest(body).
 */
export function buildBecknAuthHeader(opts: { keyId: string; bodyHash: string; createdAt?: number; expiresAt?: number }): string {
  const created = opts.createdAt ?? Math.floor(Date.now() / 1000);
  const expires = opts.expiresAt ?? created + 30;
  const sig = createHash("sha256")
    .update(`${opts.keyId}.${created}.${expires}.${opts.bodyHash}`)
    .digest("base64");
  return `Signature keyId="${opts.keyId}",algorithm="ed25519",created="${created}",expires="${expires}",headers="(created) (expires) digest",signature="${sig}"`;
}

export function bodyHash(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? {})).digest("base64");
}
