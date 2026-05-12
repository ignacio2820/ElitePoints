import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatARS(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(n);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}

/** Huellitas visibles: entero, redondeo al más cercano (≥0,5 sube). */
export function huellitasEnteras(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

export function formatHuellitas(n: number): string {
  return formatNumber(huellitasEnteras(n));
}

export function formatPercent(n: number, fractionDigits = 1): string {
  return new Intl.NumberFormat("es-AR", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(n);
}
