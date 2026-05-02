import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function maskAadhaar(last4: string): string {
  return `XXXX-XXXX-${last4}`;
}

export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10) return phone;
  const last = cleaned.slice(-10);
  return `+91 ${last.slice(0, 5)} ${last.slice(5)}`;
}

export function timeAgo(d: Date | string | number): string {
  const date = d instanceof Date ? d : new Date(d);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  const intervals: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [604800, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [sec, label] of intervals) {
    const count = Math.floor(seconds / sec);
    if (count >= 1) return `${count} ${label}${count === 1 ? "" : "s"} ago`;
  }
  return "just now";
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function safeParseInt(v: unknown, fallback: number): number {
  const n = typeof v === "string" ? parseInt(v, 10) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}
