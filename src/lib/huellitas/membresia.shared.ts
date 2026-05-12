import type { InfoLocal } from "./localService";

export const PLANES_MEMBRESIA = [
  {
    id: "mensual",
    etiqueta: "Mensual",
    precioUsd: 30,
    ahorro: null,
    meses: 1
  },
  {
    id: "semestral",
    etiqueta: "Semestral",
    precioUsd: 150,
    ahorro: "15%",
    meses: 6
  },
  {
    id: "anual",
    etiqueta: "Anual",
    precioUsd: 270,
    ahorro: "25%",
    meses: 12
  }
] as const;

export const PLANES_PAGO_PUBLICO = PLANES_MEMBRESIA.filter(
  (plan) => plan.id === "semestral" || plan.id === "anual"
);

export type PlanMembresia = (typeof PLANES_MEMBRESIA)[number]["id"];
export type PlanPagoPublico = (typeof PLANES_PAGO_PUBLICO)[number]["id"];

export const MESES_POR_PLAN: Record<PlanMembresia, number> = {
  mensual: 1,
  semestral: 6,
  anual: 12
};

export function esPlanMembresia(value: string): value is PlanMembresia {
  return value in MESES_POR_PLAN;
}

export function esPlanPagoPublico(value: string): value is PlanPagoPublico {
  return value === "semestral" || value === "anual";
}

export type EstadoMembresia =
  | "pendiente"
  | "activa"
  | "activo"
  | "trial"
  | "expirado"
  | "expirada";

function normalizarEstadoMembresia(estado?: string): string | undefined {
  return estado?.trim().toLowerCase();
}

export function trialVigente(
  info: Pick<InfoLocal, "trialHasta">
): boolean {
  if (!info.trialHasta) return false;
  return info.trialHasta.getTime() > Date.now();
}

export function tieneAccesoOperativo(
  info: Pick<
    InfoLocal,
    | "estadoMembresia"
    | "membresiaEstado"
    | "fechaVencimiento"
    | "trialHasta"
  >
): boolean {
  if (trialVigente(info)) return true;

  const estado = normalizarEstadoMembresia(
    info.estadoMembresia ?? info.membresiaEstado
  );
  if (estado === "trial") return true;
  if (estado === "activo" || estado === "activa") {
    if (!info.fechaVencimiento) return true;
    return info.fechaVencimiento.getTime() > Date.now();
  }
  return false;
}

export function resolverEstadoMembresia(
  info: Pick<
    InfoLocal,
    | "estadoMembresia"
    | "membresiaEstado"
    | "fechaVencimiento"
    | "trialHasta"
  >
): EstadoMembresia {
  if (trialVigente(info)) return "trial";
  if (tieneAccesoOperativo(info)) return "activo";

  const almacenado = normalizarEstadoMembresia(
    info.estadoMembresia ?? info.membresiaEstado
  );
  if (almacenado === "expirado" || almacenado === "expirada") return "expirado";
  if (almacenado === "activo" || almacenado === "activa") return "expirado";
  if (almacenado === "trial") return "expirado";
  return "pendiente";
}

export function isMembresiaExpirada(
  info: Pick<
    InfoLocal,
    | "estadoMembresia"
    | "membresiaEstado"
    | "fechaVencimiento"
    | "trialHasta"
  >
): boolean {
  return !tieneAccesoOperativo(info);
}

export function isMembresiaActiva(
  info: Pick<
    InfoLocal,
    | "estadoMembresia"
    | "membresiaEstado"
    | "fechaVencimiento"
    | "trialHasta"
  >
): boolean {
  return tieneAccesoOperativo(info);
}

export function diasHastaVencimiento(
  info: Pick<InfoLocal, "fechaVencimiento">
): number | null {
  if (!info.fechaVencimiento) return null;
  const diff = info.fechaVencimiento.getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function membresiaPorVencer(
  info: Pick<
    InfoLocal,
    | "estadoMembresia"
    | "membresiaEstado"
    | "fechaVencimiento"
    | "trialHasta"
  >,
  diasUmbral = 7
): boolean {
  if (!tieneAccesoOperativo(info)) return false;
  if (trialVigente(info)) return false;

  const estado = normalizarEstadoMembresia(
    info.estadoMembresia ?? info.membresiaEstado
  );
  if (estado === "trial") return false;

  const dias = diasHastaVencimiento(info);
  return dias !== null && dias > 0 && dias <= diasUmbral;
}
