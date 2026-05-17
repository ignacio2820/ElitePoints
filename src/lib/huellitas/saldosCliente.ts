import { FieldValue } from "firebase-admin/firestore";
import { calcularNivel, progresoNivel } from "@/lib/huellitas/engine";
import type { NivelLealtad } from "@/lib/huellitas/types";

/**
 * Saldos del cliente en Firestore.
 *
 * - `huellitasActuales` / `saldoHuellitas`: saldo para canjes (baja al canjear).
 * - `huellitasHistoricas` / `acumuladoHistorico`: total de por vida (solo sube con
 *   compras/emisiones; define el rango y NUNCA baja con canjes).
 */
export type ClienteSaldosDoc = {
  huellitasActuales?: number;
  huellitasHistoricas?: number;
  saldoHuellitas?: number;
  acumuladoHistorico?: number;
};

export function leerHuellitasActuales(doc: ClienteSaldosDoc): number {
  const v = doc.huellitasActuales ?? doc.saldoHuellitas ?? 0;
  return Math.max(0, Number(v));
}

export function leerHuellitasHistoricas(doc: ClienteSaldosDoc): number {
  const v = doc.huellitasHistoricas ?? doc.acumuladoHistorico ?? 0;
  return Math.max(0, Number(v));
}

/** Escritura dual: mantiene nombres nuevos y legacy sincronizados. */
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

export function incrementHuellitasActuales(delta: number): Record<string, unknown> {
  const d = Math.round(delta);
  return {
    huellitasActuales: FieldValue.increment(d),
    saldoHuellitas: FieldValue.increment(d)
  };
}

export function incrementHuellitasHistoricas(delta: number): Record<string, unknown> {
  const d = Math.round(delta);
  return {
    huellitasHistoricas: FieldValue.increment(d),
    acumuladoHistorico: FieldValue.increment(d)
  };
}

/** Venta / emisión: suben actuales e históricas en paralelo. */
export function patchIncrementoVenta(
  deltaActuales: number,
  deltaHistoricas: number
): Record<string, unknown> {
  return {
    ...incrementHuellitasActuales(deltaActuales),
    ...incrementHuellitasHistoricas(deltaHistoricas)
  };
}

/** Canje / reserva de ticket: solo descuenta el saldo disponible. */
export function patchSoloHuellitasActuales(valor: number): Record<string, number> {
  return patchHuellitasActuales(valor);
}

export function calcularNivelCliente(
  doc: ClienteSaldosDoc,
  niveles: NivelLealtad[]
) {
  return calcularNivel(leerHuellitasHistoricas(doc), niveles);
}

export function progresoNivelCliente(doc: ClienteSaldosDoc, niveles: NivelLealtad[]) {
  return progresoNivel(leerHuellitasHistoricas(doc), niveles);
}
