import { niveleseOrdenados } from "@/lib/huellitas/engine";
import type { NivelLealtad } from "@/lib/huellitas/types";
import type { ParticipanteSorteo } from "@/lib/huellitas/sorteosTypes";

/** Utilidades puras de sorteos — seguras para Client Components. */

export function umbralNivelMinimoSorteo(
  nivelMinimo: string,
  niveles: NivelLealtad[]
): number {
  if (nivelMinimo === "todos") return 0;
  const n = niveles.find((x) => x.id === nivelMinimo);
  return n?.umbralHistorico ?? 0;
}

export function clienteCumpleNivelSorteo(
  huellitasHistoricas: number,
  nivelMinimo: string,
  niveles: NivelLealtad[]
): boolean {
  return huellitasHistoricas >= umbralNivelMinimoSorteo(nivelMinimo, niveles);
}

export function labelFiltroNivel(
  nivelMinimo: string,
  niveles: NivelLealtad[]
): string {
  if (nivelMinimo === "todos") return "Todos los niveles";
  const ord = niveleseOrdenados(niveles);
  const n = ord.find((x) => x.id === nivelMinimo);
  return n ? `Solo ${n.nombre} y superior` : nivelMinimo;
}

/**
 * Selección ponderada: entero aleatorio en [1, totalPesos], recorrido acumulativo.
 */
export function seleccionarGanadorPonderado(
  participantes: ParticipanteSorteo[]
): string | null {
  const total = participantes.reduce((s, p) => s + Math.max(0, p.peso), 0);
  if (total <= 0 || participantes.length === 0) return null;

  const r = Math.floor(Math.random() * total) + 1;
  let acum = 0;
  for (const p of participantes) {
    acum += p.peso;
    if (r <= acum) return p.clienteId;
  }
  return participantes[participantes.length - 1]!.clienteId;
}
