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

/** Puntos visibles: entero, redondeo al más cercano (≥0,5 sube). */
export function puntosEnteros(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/** @deprecated Usar `puntosEnteros`. */
export const huellitasEnteras = puntosEnteros;

export function formatPuntos(n: number): string {
  return formatNumber(puntosEnteros(n));
}

/** @deprecated Usar `formatPuntos`. */
export const formatHuellitas = formatPuntos;

export function formatPercent(n: number, fractionDigits = 1): string {
  return new Intl.NumberFormat("es-AR", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(n);
}
