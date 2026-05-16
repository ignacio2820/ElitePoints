import {
  fechaCumpleEnAnio,
  partesFechaNacimiento
} from "./fechaNacimientoMascota";

/** Esta semana: hoy hasta dentro de 6 días (incluye hoy y mañana). */
export const CUMPLEANOS_ESTA_SEMANA_MIN = 0;
export const CUMPLEANOS_ESTA_SEMANA_MAX = 6;

/** Próximas semanas: del día 7 al 30. */
export const CUMPLEANOS_DIAS_MIN = 7;
export const CUMPLEANOS_DIAS_MAX = 30;

const MS_DIA = 86_400_000;

/**
 * Días calendario hasta el próximo cumpleaños (0 = hoy). null si la fecha es inválida.
 */
export function diasHastaProximoCumple(
  fechaNacimientoISO: string,
  hoy: Date = new Date()
): number | null {
  const partes = partesFechaNacimiento(fechaNacimientoISO);
  if (!partes) return null;

  const hoyMid = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12, 0, 0, 0);
  let anio = hoyMid.getFullYear();
  let cumple = fechaCumpleEnAnio(partes.mes, partes.dia, anio);

  if (cumple.getTime() < hoyMid.getTime()) {
    anio += 1;
    cumple = fechaCumpleEnAnio(partes.mes, partes.dia, anio);
  }

  return Math.round((cumple.getTime() - hoyMid.getTime()) / MS_DIA);
}

export function estaEnVentanaProximosCumpleanos(
  diasRestantes: number,
  minDias = CUMPLEANOS_DIAS_MIN,
  maxDias = CUMPLEANOS_DIAS_MAX
): boolean {
  return diasRestantes >= minDias && diasRestantes <= maxDias;
}

export function fechaProximoCumple(
  fechaNacimientoISO: string,
  hoy: Date = new Date()
): Date | null {
  const dias = diasHastaProximoCumple(fechaNacimientoISO, hoy);
  if (dias === null) return null;
  const partes = partesFechaNacimiento(fechaNacimientoISO);
  if (!partes) return null;
  const hoyMid = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12, 0, 0, 0);
  let anio = hoyMid.getFullYear();
  let cumple = fechaCumpleEnAnio(partes.mes, partes.dia, anio);
  if (cumple.getTime() < hoyMid.getTime()) {
    cumple = fechaCumpleEnAnio(partes.mes, partes.dia, anio + 1);
  }
  return cumple;
}

export function etiquetaDiaCumple(fecha: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long"
  }).format(fecha);
}

export function etiquetaDiasRestantes(dias: number): string {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}

export function urlWhatsAppFelicitacionCumple(args: {
  telefono: string;
  nombreMascota: string;
  nombreDueno: string;
  nombreLocal: string;
  diaCumple: string;
}): string | null {
  const tel = args.telefono.replace(/[^0-9]/g, "");
  if (tel.length < 8) return null;
  const texto =
    `¡Hola ${args.nombreDueno}! 🎂 Desde ${args.nombreLocal} te saludamos por el cumple de ${args.nombreMascota} ` +
    `(${args.diaCumple}). ¡Que lo pasen hermoso!`;
  return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
}
