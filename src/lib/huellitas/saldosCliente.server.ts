import { FieldValue } from "firebase-admin/firestore";
import { patchHuellitasActuales, patchHuellitasHistoricas } from "@/lib/huellitas/saldosCliente";

/** Escrituras con FieldValue — solo importar desde código server (API routes, services). */

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

export { patchHuellitasActuales, patchHuellitasHistoricas };
