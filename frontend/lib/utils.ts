import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmtINR = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
};

export const fmtNumber = (v: number | string | null | undefined) =>
  new Intl.NumberFormat("en-IN").format(Number(v ?? 0));
