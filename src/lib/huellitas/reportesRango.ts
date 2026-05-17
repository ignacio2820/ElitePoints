/** Utilidades puras de rangos temporales para reportes admin. */

export type RangoReporte = "hoy" | "7d" | "mes" | "anio";

export const RANGOS_REPORTE: { id: RangoReporte; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "7d", label: "Últimos 7 días" },
  { id: "mes", label: "Este mes" },
  { id: "anio", label: "Este año" }
];

export type VentanaReporte = {
  rango: RangoReporte;
  desde: Date;
  hasta: Date;
  /** Etiqueta legible del período. */
  etiqueta: string;
};

function inicioDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function finDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolverVentanaReporte(
  rango: RangoReporte,
  ahora: Date = new Date()
): VentanaReporte {
  const hasta = finDia(ahora);

  if (rango === "hoy") {
    return {
      rango,
      desde: inicioDia(ahora),
      hasta,
      etiqueta: "Hoy"
    };
  }

  if (rango === "7d") {
    const desde = inicioDia(ahora);
    desde.setDate(desde.getDate() - 6);
    return {
      rango,
      desde,
      hasta,
      etiqueta: "Últimos 7 días"
    };
  }

  if (rango === "mes") {
    const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
    return {
      rango,
      desde,
      hasta,
      etiqueta: "Este mes"
    };
  }

  const desde = new Date(ahora.getFullYear(), 0, 1, 0, 0, 0, 0);
  return {
    rango,
    desde,
    hasta,
    etiqueta: "Este año"
  };
}

/** Período anterior de la misma duración (para crecimiento de comunidad). */
export function periodoAnterior(ventana: VentanaReporte): {
  desde: Date;
  hasta: Date;
} {
  const ms = ventana.hasta.getTime() - ventana.desde.getTime();
  const hastaPrev = new Date(ventana.desde.getTime() - 1);
  const desdePrev = new Date(hastaPrev.getTime() - ms);
  return { desde: desdePrev, hasta: hastaPrev };
}

export function parseRangoReporte(raw: string | null): RangoReporte {
  if (raw === "hoy" || raw === "7d" || raw === "mes" || raw === "anio") return raw;
  return "mes";
}
