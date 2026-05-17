import { partesFechaNacimiento } from "@/lib/huellitas/fechaNacimientoMascota";

/** Utilidades puras para la cartelera admin (mes calendario actual). */

export function mascotaCumpleEnMesCalendario(
  fechaNacimientoISO: string,
  hoy: Date = new Date()
): boolean {
  const partes = partesFechaNacimiento(fechaNacimientoISO);
  if (!partes) return false;
  return partes.mes === hoy.getMonth() + 1;
}

export function diaMesDesdeFechaNacimiento(fechaNacimientoISO: string): number | null {
  const partes = partesFechaNacimiento(fechaNacimientoISO);
  return partes?.dia ?? null;
}

export type EstadoDiaMes = "pasado" | "hoy" | "proximo";

export function estadoCumpleEnMes(
  fechaNacimientoISO: string,
  hoy: Date = new Date()
): EstadoDiaMes | null {
  const partes = partesFechaNacimiento(fechaNacimientoISO);
  if (!partes || partes.mes !== hoy.getMonth() + 1) return null;

  const diaHoy = hoy.getDate();
  if (partes.dia < diaHoy) return "pasado";
  if (partes.dia === diaHoy) return "hoy";
  return "proximo";
}

export function nombreMesActual(hoy: Date = new Date()): string {
  return new Intl.DateTimeFormat("es-AR", { month: "long" }).format(hoy);
}
