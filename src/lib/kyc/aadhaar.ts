/**
 * Aadhaar verification - simulated.
 *
 * Real UIDAI integration is NOT publicly accessible. Only KUA/AUA license
 * holders can perform e-KYC against UIDAI servers. This module performs:
 *  - Real Verhoeff checksum validation (the same algorithm UIDAI uses).
 *  - Real masking helpers (only last-4 ever stored in plaintext).
 *  - Hashed full-Aadhaar for de-duplication / lookup.
 *  - Simulated OTP "send" + "verify" flow that mirrors UIDAI's auth API.
 *  - Simulated DigiLocker e-KYC response shape so the rest of the app
 *    integrates against a realistic contract.
 *
 * Switch AADHAAR_MODE=disabled in env to disable the demo flow entirely.
 */
import { createHash, randomBytes, timingSafeEqual } from "crypto";

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function verhoeffValid(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length !== 12) return false;
  let c = 0;
  const reversed = digits.split("").reverse().map(Number);
  for (let i = 0; i < reversed.length; i++) {
    const row = VERHOEFF_D[c]!;
    const d = reversed[i]!;
    const p = VERHOEFF_P[i % 8]![d]!;
    c = row[p]!;
  }
  return c === 0;
}

export function isValidAadhaarFormat(input: string): boolean {
  const cleaned = input.replace(/\D/g, "");
  if (cleaned.length !== 12) return false;
  if (cleaned[0] === "0" || cleaned[0] === "1") return false; // UIDAI rule: cannot start with 0/1
  return verhoeffValid(cleaned);
}

export function lastFour(input: string): string {
  return input.replace(/\D/g, "").slice(-4);
}

export function hashAadhaar(input: string): string {
  // Salted SHA-256. Salt comes from BETTER_AUTH_SECRET so it's app-bound.
  const salt = process.env.BETTER_AUTH_SECRET ?? "salt";
  return createHash("sha256").update(salt + ":aadhaar:" + input.replace(/\D/g, "")).digest("hex");
}

// ------ Simulated OTP store ------
type OtpEntry = { otp: string; aadhaarHash: string; expiresAt: number; attempts: number };
const OTP_STORE = new Map<string, OtpEntry>();
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

export type SimulatedOtpResponse = { txnId: string; sentTo: string; expiresInSec: number; demoOtp?: string };

export function simulateSendAadhaarOtp(aadhaar: string): SimulatedOtpResponse {
  if (!isValidAadhaarFormat(aadhaar)) throw new Error("Invalid Aadhaar number");
  if (process.env.AADHAAR_MODE === "disabled") throw new Error("Aadhaar verification is disabled");
  const txnId = randomBytes(8).toString("hex");
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  OTP_STORE.set(txnId, {
    otp,
    aadhaarHash: hashAadhaar(aadhaar),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
  // In demo mode we surface the OTP for testing. Real UIDAI never returns OTP in response.
  const demoOtp = process.env.AADHAAR_MODE === "demo" ? otp : undefined;
  return {
    txnId,
    sentTo: `XXXXXXXX${lastFour(aadhaar)}`,
    expiresInSec: OTP_TTL_MS / 1000,
    demoOtp,
  };
}

export function simulateVerifyAadhaarOtp(txnId: string, otp: string, aadhaar: string): {
  verified: boolean;
  reason?: string;
  ekyc?: SimulatedEkyc;
} {
  const entry = OTP_STORE.get(txnId);
  if (!entry) return { verified: false, reason: "TXN_NOT_FOUND" };
  if (entry.expiresAt < Date.now()) {
    OTP_STORE.delete(txnId);
    return { verified: false, reason: "OTP_EXPIRED" };
  }
  entry.attempts += 1;
  if (entry.attempts > OTP_MAX_ATTEMPTS) {
    OTP_STORE.delete(txnId);
    return { verified: false, reason: "TOO_MANY_ATTEMPTS" };
  }
  if (entry.aadhaarHash !== hashAadhaar(aadhaar)) {
    return { verified: false, reason: "AADHAAR_MISMATCH" };
  }
  const a = Buffer.from(entry.otp);
  const b = Buffer.from(otp);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { verified: false, reason: "INVALID_OTP" };
  }
  OTP_STORE.delete(txnId);
  return { verified: true, ekyc: simulateEkyc(aadhaar) };
}

// ------ Simulated DigiLocker / e-KYC payload ------
export type SimulatedEkyc = {
  source: "DEMO_DIGILOCKER";
  refId: string;
  issuedAt: string;
  maskedAadhaar: string;
  verified: true;
  // We do NOT return name/DOB/address from the simulator since that data does not exist;
  // the real flow would, but we won't fabricate identity attributes.
};

export function simulateEkyc(aadhaar: string): SimulatedEkyc {
  return {
    source: "DEMO_DIGILOCKER",
    refId: randomBytes(8).toString("hex"),
    issuedAt: new Date().toISOString(),
    maskedAadhaar: `XXXX-XXXX-${lastFour(aadhaar)}`,
    verified: true,
  };
}
