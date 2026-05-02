/**
 * UPI helpers - real format validation + simulated collect/intent flow.
 *
 * The UPI deeplink format we generate is standard NPCI BHIM UPI URL. Apps like
 * GPay/PhonePe/Paytm/BHIM open this on Android/iOS. No bank/PSP key required.
 *
 * For server-side collect (push payment) we simulate without contacting any PSP
 * since real UPI collect requires a bank merchant + PSP onboarding.
 */
import { randomBytes } from "crypto";

const VPA_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z]{1,64}$/;

export function isValidVpa(vpa: string): boolean {
  return VPA_REGEX.test(vpa.trim());
}

export function buildUpiIntent(opts: {
  payeeVpa: string;
  payeeName: string;
  amountInr: number;
  note?: string;
  txnRef?: string;
}): string {
  const params = new URLSearchParams({
    pa: opts.payeeVpa,
    pn: opts.payeeName,
    am: opts.amountInr.toFixed(2),
    cu: "INR",
  });
  if (opts.note) params.set("tn", opts.note);
  if (opts.txnRef) params.set("tr", opts.txnRef);
  return `upi://pay?${params.toString()}`;
}

export type SimulatedUpiCollect = {
  upiTxnRef: string;
  status: "INITIATED";
  initiatedAt: string;
  payeeVpa: string;
  amountInr: number;
  expiresInSec: number;
  source: "DEMO_NPCI";
};

export function simulateUpiCollect(opts: { payeeVpa: string; amountInr: number; payerVpa?: string }): SimulatedUpiCollect {
  if (!isValidVpa(opts.payeeVpa)) throw new Error("Invalid payee VPA");
  if (opts.payerVpa && !isValidVpa(opts.payerVpa)) throw new Error("Invalid payer VPA");
  if (opts.amountInr <= 0) throw new Error("Amount must be positive");
  return {
    upiTxnRef: "T" + randomBytes(8).toString("hex").toUpperCase(),
    status: "INITIATED",
    initiatedAt: new Date().toISOString(),
    payeeVpa: opts.payeeVpa,
    amountInr: opts.amountInr,
    expiresInSec: 5 * 60,
    source: "DEMO_NPCI",
  };
}

export function simulateUpiSettle(upiTxnRef: string): { upiTxnRef: string; status: "SUCCESS" | "FAILED"; settledAt: string } {
  // Demo: 95% success.
  const success = Math.random() < 0.95;
  return {
    upiTxnRef,
    status: success ? "SUCCESS" : "FAILED",
    settledAt: new Date().toISOString(),
  };
}
