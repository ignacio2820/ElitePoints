import { calcularNivel, progresoNivel } from "@/lib/huellitas/engine";
import type { NivelLealtad } from "@/lib/huellitas/types";

/**
 * Lectura y parches de saldos — seguro para Client Components.
 * Para incrementos con FieldValue, usar `saldosCliente.server.ts`.
 *
 * Firestore persiste `huellitasActuales` / `saldoHuellitas` y
 * `huellitasHistoricas` / `acumuladoHistorico`; en código el concepto es **puntos**.
 */
export type ClienteSaldosDoc = {
  huellitasActuales?: number;
  huellitasHistoricas?: number;
  saldoHuellitas?: number;
  acumuladoHistorico?: number;
  huellitasReservadas?: number;
};

/** Alias conceptual del documento de saldos. */
export type ClientePuntosDoc = ClienteSaldosDoc;

export function leerHuellitasActuales(doc: ClienteSaldosDoc): number {
  const v = doc.huellitasActuales ?? doc.saldoHuellitas ?? 0;
  return Math.max(0, Number(v));
}

export function leerHuellitasHistoricas(doc: ClienteSaldosDoc): number {
  const v = doc.huellitasHistoricas ?? doc.acumuladoHistorico ?? 0;
  return Math.max(0, Number(v));
}

export function leerPuntosReservados(doc: ClienteSaldosDoc): number {
  return Math.max(0, Number(doc.huellitasReservadas ?? 0));
}

/** Saldo disponible para canje (descontando reservas pendientes). */
export function leerPuntosDisponibles(doc: ClienteSaldosDoc): number {
  return Math.max(0, leerHuellitasActuales(doc) - leerPuntosReservados(doc));
}

export const leerPuntosActuales = leerHuellitasActuales;
export const leerPuntosHistoricos = leerHuellitasHistoricas;

export function patchHuellitasActuales(valor: number): Record<string, number> {
  const n = Math.max(0, Math.round(valor));
  return {
    huellitasActuales: n,
    saldoHuellitas: n
  };
}

export function patchHuellitasHistoricas(valor: number): Record<string, number> {
  const n = Math.max(0, Math.round(valor));
  return {
    huellitasHistoricas: n,
    acumuladoHistorico: n
  };
}

export const patchPuntosActuales = patchHuellitasActuales;
export const patchPuntosHistoricos = patchHuellitasHistoricas;

export function patchSoloHuellitasActuales(valor: number): Record<string, number> {
  return patchHuellitasActuales(valor);
}

export const patchSoloPuntosActuales = patchSoloHuellitasActuales;

export function calcularNivelCliente(doc: ClienteSaldosDoc, niveles: NivelLealtad[]) {
  return calcularNivel(leerHuellitasHistoricas(doc), niveles);
}

export function progresoNivelCliente(doc: ClienteSaldosDoc, niveles: NivelLealtad[]) {
  return progresoNivel(leerHuellitasHistoricas(doc), niveles);
}
