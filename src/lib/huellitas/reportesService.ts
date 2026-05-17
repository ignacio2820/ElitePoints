import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { calcularNivel, niveleseOrdenados } from "@/lib/huellitas/engine";
import { getConfiguracion } from "@/lib/huellitas/service";
import { leerHuellitasHistoricas } from "@/lib/huellitas/saldosCliente";
import {
  periodoAnterior,
  resolverVentanaReporte,
  type RangoReporte,
  type VentanaReporte
} from "@/lib/huellitas/reportesRango";
import type { Cliente, NivelLealtad, Venta } from "@/lib/huellitas/types";

const LIMITE_VENTAS = 15_000;
const LIMITE_CANJES = 10_000;
const LIMITE_CLIENTES = 5000;

const COLORES_NIVEL: Record<string, string> = {
  cachorro: "#C9AE8C",
  explorador: "#E07A5F",
  guardian: "#8B5E3C"
};

export type ReportesKpis = {
  ventasTotalesFidelizadas: number;
  clientesActivos: number;
  tasaCanjeBurnRate: number;
  crecimientoComunidadPct: number | null;
};

export type PuntoVentaSerie = {
  fecha: string;
  label: string;
  monto: number;
  cantidadVentas: number;
};

export type SegmentoNivel = {
  nivelId: string;
  nombre: string;
  cantidad: number;
  porcentaje: number;
  color: string;
};

export type TopClienteReporte = {
  clienteId: string;
  nombre: string;
  huellitasHistoricas: number;
  nivelNombre: string;
};

export type TopPremioReporte = {
  premioId: string;
  nombre: string;
  cantidad: number;
  huellitasTotales: number;
};

export type ReportesCompletos = {
  ventana: VentanaReporte;
  kpis: ReportesKpis;
  ventasSerie: PuntoVentaSerie[];
  nivelesDistribucion: SegmentoNivel[];
  topClientes: TopClienteReporte[];
  topPremios: TopPremioReporte[];
};

function toDate(val: unknown): Date | null {
  if (val == null) return null;
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date && !Number.isNaN(val.getTime())) return val;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    try {
      return (val as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  if (typeof val === "string" && val.trim()) {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function enVentana(fecha: Date | null, ventana: VentanaReporte): boolean {
  if (!fecha) return false;
  return fecha.getTime() >= ventana.desde.getTime() && fecha.getTime() <= ventana.hasta.getTime();
}

function fechaVentaDoc(data: Record<string, unknown>): Date | null {
  return toDate(data.fecha) ?? toDate(data.creadoEn);
}

function fechaCanjeDoc(data: Record<string, unknown>): Date | null {
  return (
    toDate(data.confirmadoEn) ??
    toDate(data.fecha) ??
    toDate(data.creadoEn)
  );
}

function claveDia(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function labelDia(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(d);
}

function labelMes(anio: number, mes: number): string {
  return new Intl.DateTimeFormat("es-AR", { month: "short", year: "2-digit" }).format(
    new Date(anio, mes, 1)
  );
}

function construirSerieVentas(
  ventas: Array<{ fecha: Date; monto: number }>,
  ventana: VentanaReporte
): PuntoVentaSerie[] {
  if (ventana.rango === "anio") {
    const porMes = new Map<string, { monto: number; cantidad: number }>();
    for (const v of ventas) {
      const k = `${v.fecha.getFullYear()}-${String(v.fecha.getMonth()).padStart(2, "0")}`;
      const prev = porMes.get(k) ?? { monto: 0, cantidad: 0 };
      porMes.set(k, {
        monto: prev.monto + v.monto,
        cantidad: prev.cantidad + 1
      });
    }
    const out: PuntoVentaSerie[] = [];
    const cursor = new Date(ventana.desde);
    cursor.setDate(1);
    while (cursor <= ventana.hasta) {
      const k = `${cursor.getFullYear()}-${String(cursor.getMonth()).padStart(2, "0")}`;
      const agg = porMes.get(k) ?? { monto: 0, cantidad: 0 };
      out.push({
        fecha: k,
        label: labelMes(cursor.getFullYear(), cursor.getMonth()),
        monto: agg.monto,
        cantidadVentas: agg.cantidad
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }

  const porDia = new Map<string, { monto: number; cantidad: number }>();
  for (const v of ventas) {
    const k = claveDia(v.fecha);
    const prev = porDia.get(k) ?? { monto: 0, cantidad: 0 };
    porDia.set(k, {
      monto: prev.monto + v.monto,
      cantidad: prev.cantidad + 1
    });
  }

  const out: PuntoVentaSerie[] = [];
  const cursor = new Date(ventana.desde);
  cursor.setHours(12, 0, 0, 0);
  while (cursor <= ventana.hasta) {
    const k = claveDia(cursor);
    const agg = porDia.get(k) ?? { monto: 0, cantidad: 0 };
    out.push({
      fecha: k,
      label: labelDia(k),
      monto: agg.monto,
      cantidadVentas: agg.cantidad
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return out;
}

export async function calcularKpisReportes(
  localId: string,
  ventana: VentanaReporte
): Promise<ReportesKpis> {
  const db = adminDb();
  const desdeTs = Timestamp.fromDate(ventana.desde);

  const [ventasSnap, ventasHistoricasSnap, canjesSnap, clientesSnap] =
    await Promise.all([
      cols.ventas(db, localId).where("fecha", ">=", desdeTs).get(),
      cols.ventas(db, localId).limit(LIMITE_VENTAS).get(),
      cols.canjes(db, localId).limit(LIMITE_CANJES).get(),
      cols.clientes(db, localId).limit(LIMITE_CLIENTES).get()
    ]);

  let ventasTotalesFidelizadas = 0;
  const activosSet = new Set<string>();

  ventasSnap.docs.forEach((d) => {
    const v = d.data() as Partial<Venta>;
    const emitidas = Number(v.huellitasGeneradas ?? 0);
    if (emitidas <= 0) return;
    ventasTotalesFidelizadas += Number(v.totalVenta ?? 0);
    if (v.clienteId) activosSet.add(v.clienteId);
  });

  let emitidasHistoricas = 0;
  let canjeadasHistoricas = 0;

  ventasHistoricasSnap.docs.forEach((d) => {
    const v = d.data() as Partial<Venta>;
    emitidasHistoricas += Number(v.huellitasGeneradas ?? 0);
    canjeadasHistoricas += Number(v.huellitasCanjeadas ?? 0);
  });

  canjesSnap.docs.forEach((d) => {
    const c = d.data() as Record<string, unknown>;
    if (String(c.estado ?? "") !== "completado") return;
    canjeadasHistoricas += Number(c.costoHuellitas ?? 0);
  });

  const tasaCanjeBurnRate =
    emitidasHistoricas > 0
      ? (canjeadasHistoricas / emitidasHistoricas) * 100
      : 0;

  const prev = periodoAnterior(ventana);
  let nuevosActual = 0;
  let nuevosAnterior = 0;

  clientesSnap.docs.forEach((d) => {
    const creado = toDate((d.data() as Partial<Cliente>).creadoEn);
    if (!creado) return;
    if (enVentana(creado, ventana)) nuevosActual += 1;
    if (creado.getTime() >= prev.desde.getTime() && creado.getTime() <= prev.hasta.getTime()) {
      nuevosAnterior += 1;
    }
  });

  const crecimientoComunidadPct =
    nuevosAnterior > 0
      ? ((nuevosActual - nuevosAnterior) / nuevosAnterior) * 100
      : nuevosActual > 0
        ? 100
        : null;

  return {
    ventasTotalesFidelizadas,
    clientesActivos: activosSet.size,
    tasaCanjeBurnRate,
    crecimientoComunidadPct
  };
}

export async function obtenerReportesCompletos(
  localId: string,
  rango: RangoReporte
): Promise<ReportesCompletos> {
  const ventana = resolverVentanaReporte(rango);
  const db = adminDb();
  const cfg = await getConfiguracion(localId);
  const niveles = niveleseOrdenados(cfg.niveles);
  const desdeTs = Timestamp.fromDate(ventana.desde);

  const [kpis, ventasSnap, canjesSnap, clientesSnap] = await Promise.all([
    calcularKpisReportes(localId, ventana),
    cols.ventas(db, localId).where("fecha", ">=", desdeTs).get(),
    cols.canjes(db, localId).limit(LIMITE_CANJES).get(),
    cols.clientes(db, localId).limit(LIMITE_CLIENTES).get()
  ]);

  const ventasEnRango: Array<{ fecha: Date; monto: number }> = [];
  ventasSnap.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const emitidas = Number(data.huellitasGeneradas ?? 0);
    if (emitidas <= 0) return;
    const fecha = fechaVentaDoc(data);
    if (!fecha || !enVentana(fecha, ventana)) return;
    ventasEnRango.push({
      fecha,
      monto: Number(data.totalVenta ?? 0)
    });
  });

  const ventasSerie = construirSerieVentas(ventasEnRango, ventana);

  const conteoNivel = new Map<string, number>();
  for (const n of niveles) {
    conteoNivel.set(n.id, 0);
  }

  clientesSnap.docs.forEach((d) => {
    const data = d.data() as Partial<Cliente>;
    const historico = leerHuellitasHistoricas(data);
    if (historico <= 0) return;
    const nivel = calcularNivel(historico, niveles);
    conteoNivel.set(nivel.id, (conteoNivel.get(nivel.id) ?? 0) + 1);
  });

  const totalClientesNivel = Array.from(conteoNivel.values()).reduce((a, b) => a + b, 0);
  const nivelesDistribucion: SegmentoNivel[] = niveles.map((n: NivelLealtad) => {
    const cantidad = conteoNivel.get(n.id) ?? 0;
    return {
      nivelId: n.id,
      nombre: n.nombre,
      cantidad,
      porcentaje: totalClientesNivel > 0 ? (cantidad / totalClientesNivel) * 100 : 0,
      color: COLORES_NIVEL[n.tema] ?? "#E07A5F"
    };
  });

  const topClientes: TopClienteReporte[] = clientesSnap.docs
    .map((d) => {
      const data = d.data() as Partial<Cliente>;
      const historico = leerHuellitasHistoricas(data);
      if (historico <= 0) return null;
      const nivel = calcularNivel(historico, niveles);
      return {
        clienteId: d.id,
        nombre: String(data.nombre ?? "—").trim() || "—",
        huellitasHistoricas: historico,
        nivelNombre: nivel.nombre
      };
    })
    .filter((x): x is TopClienteReporte => x !== null)
    .sort((a, b) => b.huellitasHistoricas - a.huellitasHistoricas)
    .slice(0, 5);

  const premioAgg = new Map<
    string,
    { nombre: string; cantidad: number; huellitas: number }
  >();

  canjesSnap.docs.forEach((d) => {
    const c = d.data() as Record<string, unknown>;
    if (String(c.estado ?? "") !== "completado") return;
    const fecha = fechaCanjeDoc(c);
    if (!fecha || !enVentana(fecha, ventana)) return;
    const premioId = String(c.premioId ?? d.id);
    const nombre = String(c.premioNombre ?? "Premio");
    const costo = Number(c.costoHuellitas ?? 0);
    const prev = premioAgg.get(premioId) ?? {
      nombre,
      cantidad: 0,
      huellitas: 0
    };
    premioAgg.set(premioId, {
      nombre: prev.nombre,
      cantidad: prev.cantidad + 1,
      huellitas: prev.huellitas + costo
    });
  });

  const topPremios: TopPremioReporte[] = Array.from(premioAgg.entries())
    .map(([premioId, v]) => ({
      premioId,
      nombre: v.nombre,
      cantidad: v.cantidad,
      huellitasTotales: v.huellitas
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  return {
    ventana,
    kpis,
    ventasSerie,
    nivelesDistribucion,
    topClientes,
    topPremios
  };
}
