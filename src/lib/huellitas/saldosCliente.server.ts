import { FieldValue } from "firebase-admin/firestore";
import {
  patchHuellitasActuales,
  patchHuellitasHistoricas,
  patchPuntosActuales,
  patchPuntosHistoricos
} from "@/lib/huellitas/saldosCliente";

/** Escrituras con FieldValue — solo servidor (API routes, services). */

export function incrementHuellitasActuales(delta: number): Record<string, unknown> {
  const d = Math.round(delta);
  return {
    huellitasActuales: FieldValue.increment(d),
    saldoHuellitas: FieldValue.increment(d)
  };
}

export const incrementPuntosActuales = incrementHuellitasActuales;

export function incrementHuellitasHistoricas(delta: number): Record<string, unknown> {
  const d = Math.round(delta);
  return {
    huellitasHistoricas: FieldValue.increment(d),
    acumuladoHistorico: FieldValue.increment(d)
  };
}

export const incrementPuntosHistoricos = incrementHuellitasHistoricas;

export function patchIncrementoVenta(
  deltaActuales: number,
  deltaHistoricas: number
): Record<string, unknown> {
  return {
    ...incrementHuellitasActuales(deltaActuales),
    ...incrementHuellitasHistoricas(deltaHistoricas)
  };
}

export const patchIncrementoVentaPuntos = patchIncrementoVenta;

export {
  patchHuellitasActuales,
  patchHuellitasHistoricas,
  patchPuntosActuales,
  patchPuntosHistoricos
};
