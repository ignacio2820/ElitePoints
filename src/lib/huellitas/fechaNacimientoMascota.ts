import { Timestamp } from "firebase-admin/firestore";

/**
 * Normaliza fecha de nacimiento de mascota (string YYYY-MM-DD o Timestamp Firestore).
 */
export function normalizarFechaNacimientoMascota(raw: unknown): string | null {
  if (raw == null || raw === "") return null;

  if (typeof raw === "string") {
    const t = raw.trim();
    const iso = t.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const parsed = new Date(t);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return null;
  }

  if (raw instanceof Timestamp) {
    return raw.toDate().toISOString().slice(0, 10);
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }

  if (typeof raw === "object" && raw !== null) {
    if ("toDate" in raw && typeof (raw as { toDate: () => Date }).toDate === "function") {
      try {
        return (raw as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
      } catch {
        return null;
      }
    }
    if ("seconds" in raw && typeof (raw as { seconds: number }).seconds === "number") {
      return new Date((raw as { seconds: number }).seconds * 1000)
        .toISOString()
        .slice(0, 10);
    }
  }

  return null;
}

export function partesFechaNacimiento(
  fechaISO: string
): { anio: number; mes: number; dia: number } | null {
  const m = fechaISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return { anio, mes, dia };
}

function esAnioBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

/** Fecha de cumpleaños en el año indicado (ajusta 29-feb en años no bisiestos). */
export function fechaCumpleEnAnio(
  mes: number,
  dia: number,
  anio: number
): Date {
  let d = dia;
  let m = mes;
  if (mes === 2 && dia === 29 && !esAnioBisiesto(anio)) {
    d = 28;
  }
  return new Date(anio, m - 1, d, 12, 0, 0, 0);
}
