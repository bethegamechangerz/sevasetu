/**
 * GSTIN format + checksum (real, no API call).
 * Format: 15 chars - 2 digits (state) + 10 chars PAN + 1 entity num + 1 char (Z) + 1 check digit.
 */
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d$/;
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function isValidGstinFormat(gstin: string): boolean {
  return GSTIN_REGEX.test(gstin.toUpperCase().trim());
}

export function isValidGstinChecksum(gstin: string): boolean {
  const upper = gstin.toUpperCase().trim();
  if (upper.length !== 15) return false;
  const factor = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const idx = ALPHABET.indexOf(upper[i]!);
    if (idx === -1) return false;
    const product = idx * factor[i]!;
    sum += Math.floor(product / 36) + (product % 36);
  }
  const check = (36 - (sum % 36)) % 36;
  return ALPHABET[check] === upper[14];
}

const STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman & Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
};

export function gstinState(gstin: string): string | null {
  return STATE_CODES[gstin.slice(0, 2)] ?? null;
}

export type SimulatedGstinVerify = {
  gstin: string;
  status: "VALID" | "INVALID";
  state: string | null;
  source: "DEMO_GSTN";
  verifiedAt: string;
};

export function simulateVerifyGstin(gstin: string): SimulatedGstinVerify {
  const upper = gstin.toUpperCase().trim();
  const valid = isValidGstinFormat(upper) && isValidGstinChecksum(upper);
  return {
    gstin: upper,
    status: valid ? "VALID" : "INVALID",
    state: gstinState(upper),
    source: "DEMO_GSTN",
    verifiedAt: new Date().toISOString(),
  };
}
