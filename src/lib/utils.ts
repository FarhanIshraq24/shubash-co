import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Decimal from "decimal.js";

/**
 * Merge Tailwind classes safely without conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format Bangladesh Taka (BDT) using ৳ symbol
 * Uses exact decimal representation to avoid floating point anomalies.
 */
export function formatBDT(amount: Decimal | number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "৳0";

  try {
    const d = new Decimal(amount.toString());
    const isWhole = d.modulo(1).isZero();
    const formattedNum = (isWhole ? d.toFixed(0) : d.toFixed(2))
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `৳${formattedNum}`;
  } catch {
    return `৳${amount}`;
  }
}

/**
 * Format volume in ml with appropriate precision
 */
export function formatVolume(ml: Decimal | number | string | null | undefined): string {
  if (ml === null || ml === undefined) return "0 ml";
  try {
    const d = new Decimal(ml.toString());
    const isWhole = d.modulo(1).isZero();
    return `${isWhole ? d.toFixed(0) : d.toFixed(1)}ml`;
  } catch {
    return `${ml}ml`;
  }
}

/**
 * Format date in Bangladesh Standard Time (Asia/Dhaka)
 */
export function formatDhakaDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Generate human-friendly order reference (e.g., SC-2026-00042)
 */
export function generateOrderNumber(sequence?: number): string {
  const year = new Date().getFullYear();
  const seq = sequence !== undefined ? sequence : Math.floor(1000 + Math.random() * 9000);
  const padded = seq.toString().padStart(5, "0");
  return `SC-${year}-${padded}`;
}

/**
 * Safe string slugifier
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
