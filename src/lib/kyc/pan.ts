/**
 * PAN validation.
 * Format: AAAAA9999A. 4th char encodes entity type (P = Individual).
 * NSDL/Protean PAN verification API requires registered TIN-FC; we simulate it.
 */
const PAN_REGEX = /^[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]$/;

export function isValidPanFormat(pan: string): boolean {
  return PAN_REGEX.test(pan.toUpperCase().trim());
}

export function panEntityType(pan: string): string {
  const c = pan.toUpperCase()[3];
  switch (c) {
    case "P":
      return "Individual";
    case "C":
      return "Company";
    case "H":
      return "HUF";
    case "F":
      return "Firm";
    case "A":
      return "AOP";
    case "T":
      return "Trust";
    case "B":
      return "BOI";
    case "L":
      return "Local Authority";
    case "J":
      return "Artificial Juridical Person";
    case "G":
      return "Government";
    default:
      return "Unknown";
  }
}

export type SimulatedPanVerify = {
  pan: string;
  entityType: string;
  status: "VALID" | "INVALID";
  source: "DEMO_PROTEAN";
  verifiedAt: string;
};

export function simulateVerifyPan(pan: string): SimulatedPanVerify {
  const upper = pan.toUpperCase().trim();
  return {
    pan: upper,
    entityType: panEntityType(upper),
    status: isValidPanFormat(upper) ? "VALID" : "INVALID",
    source: "DEMO_PROTEAN",
    verifiedAt: new Date().toISOString(),
  };
}
