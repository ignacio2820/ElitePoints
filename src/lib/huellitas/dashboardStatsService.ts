import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import type { Cliente, Venta } from "./types";

/**
 * Servicio server-side de métricas para el panel admin.
 *
 * Diseño:
 *  - Cada función es independiente y puede ejecutarse en paralelo.
 *  - Privilegiamos pocas queries grandes en lugar de N+1: traemos un
 *    rango de ventas/canjes y agregamos en memoria.
 *  - Para locales chicos/medianos (<10k ventas/mes) esto es ágil. Si crece,
 *    el siguiente paso natural es un /Stats/diario actualizado por
 *    Cloud Functions on-write y leerlo desde acá.
 */

// ───────────────────────────────────────────────────────────────────────────
// 1) Emisión vs Canje (salud financiera)
// ───────────────────────────────────────────────────────────────────────────

export interface EmisionVsCanjeStats {
  /** Ventana en días sobre la que se calcularon las cifras. */
  diasVentana: number;
  /** Suma de huellitas acreditadas en el período. */
  emitidas: number;
  /**
   * Suma de huellitas consumidas en el período: incluye lo descontado en
   * ventas (`huellitasCanjeadas` de cada Venta) + canjes confirmados de
   * premios (sub-collección /Canjes con su propio descuento).
   */
  canjeadas: number;
  /** Cantidad de ventas registradas en el período. */
  cantidadVentas: number;
  /** Cantidad de canjes confirmados (premios) en el período. */
  cantidadCanjes: number;
  /**
   * Ratio canjeadas/emitidas (0..1). Si es muy alto (cerca de 1) significa
   * que los clientes están consumiendo casi todo lo que ganan; útil para
   * decidir si cambiar el costo del programa.
   */
  ratioCanjeEmision: number;
}

function fechaDesde(dias: number): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

export async function calcularEmisionVsCanje(
  localId: string,
  diasVentana = 30
): Promise<EmisionVsCanjeStats> {
  const db = adminDb();
  const desde = fechaDesde(diasVentana);

  // Query directa: Ventas en el período. Requiere índice simple en `fecha`.
  // Si el índice no existe, Firestore devuelve un error claro la primera
  // vez con el link para crearlo desde la consola.
  const [ventasSnap, canjesSnap] = await Promise.all([
    cols.ventas(db, localId).where("fecha", ">=", desde).get(),
    cols.canjes(db, localId).where("fecha", ">=", desde).get()
  ]);

  let emitidas = 0;
  let canjeadasEnVenta = 0;
  ventasSnap.docs.forEach((d) => {
    const v = d.data() as Partial<Venta>;
    emitidas += Number(v.huellitasGeneradas ?? 0);
    canjeadasEnVenta += Number(v.huellitasCanjeadas ?? 0);
  });

  let canjeadasEnPremios = 0;
  canjesSnap.docs.forEach((d) => {
    const c = d.data() as { huellitasCanjeadas?: number };
    canjeadasEnPremios += Number(c.huellitasCanjeadas ?? 0);
  });

  const canjeadas = canjeadasEnVenta + canjeadasEnPremios;

  return {
    diasVentana,
    emitidas,
    canjeadas,
    cantidadVentas: ventasSnap.size,
    cantidadCanjes: canjesSnap.size,
    ratioCanjeEmision: emitidas > 0 ? canjeadas / emitidas : 0
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 2) Top clientes (puntos históricos)
// ───────────────────────────────────────────────────────────────────────────

export interface ClienteRanking {
  clienteId: string;
  nombre: string;
  puntosHistoricos: number;
  nivelId?: string;
}

export async function topClientesPorPuntos(
  localId: string,
  top = 5
): Promise<ClienteRanking[]> {
  const db = adminDb();
  const snap = await cols
    .clientes(db, localId)
    .orderBy("acumuladoHistorico", "desc")
    .limit(top)
    .get();

  return snap.docs
    .map((d) => {
      const c = d.data() as Partial<Cliente>;
      const puntos = Number(c.acumuladoHistorico ?? c.huellitasHistoricas ?? 0);
      return {
        clienteId: d.id,
        nombre: String(c.nombre ?? "Cliente"),
        puntosHistoricos: puntos,
        nivelId: c.nivelId
      };
    })
    .filter((r) => r.puntosHistoricos > 0);
}

// ───────────────────────────────────────────────────────────────────────────
// 3) Tasa de Retención (Churn)
// ───────────────────────────────────────────────────────────────────────────

export interface RetencionStats {
  /** Ventana en días para considerar un cliente "activo". */
  diasVentana: number;
  /** Total de clientes que alguna vez registraron una venta. */
  totalConHistorial: number;
  /** Clientes con al menos 1 venta dentro de la ventana. */
  activos: number;
  /** Clientes con historial que NO tuvieron ventas en la ventana. */
  enRiesgo: number;
  /** Clientes nuevos (sin ninguna venta histórica). */
  nuevosSinCompras: number;
  /** Tasa de retención (0..1) = activos / (activos + enRiesgo). */
  tasaRetencion: number;
  /** Tasa de churn (0..1) = enRiesgo / (activos + enRiesgo). */
  tasaChurn: number;
  /** Total de clientes en el local (para contexto). */
  totalClientes: number;
}

export async function calcularRetencion(
  localId: string,
  diasVentana = 60
): Promise<RetencionStats> {
  const db = adminDb();
  const desde = fechaDesde(diasVentana);

  // 1) Set de clienteIds con ventas en la ventana → activos.
  //    Una sola query por todas las ventas recientes; agrupamos en memoria.
  const ventasRecientesSnap = await cols
    .ventas(db, localId)
    .where("fecha", ">=", desde)
    .get();
  const idsActivos = new Set<string>();
  ventasRecientesSnap.docs.forEach((d) => {
    const v = d.data() as { clienteId?: string };
    if (v.clienteId) idsActivos.add(v.clienteId);
  });

  // 2) Universo de clientes. Para locales chicos/medianos cabe en memoria;
  //    si llegara a haber >5k clientes, agregamos paginación.
  const clientesSnap = await cols.clientes(db, localId).limit(5000).get();
  let activos = 0;
  let enRiesgo = 0;
  let nuevosSinCompras = 0;
  clientesSnap.docs.forEach((d) => {
    const c = d.data() as Partial<Cliente>;
    const conHistorial = (c.acumuladoHistorico ?? 0) > 0;
    if (idsActivos.has(d.id)) {
      activos++;
    } else if (conHistorial) {
      enRiesgo++;
    } else {
      nuevosSinCompras++;
    }
  });

  const baseRetencion = activos + enRiesgo;
  return {
    diasVentana,
    totalClientes: clientesSnap.size,
    totalConHistorial: baseRetencion,
    activos,
    enRiesgo,
    nuevosSinCompras,
    tasaRetencion: baseRetencion > 0 ? activos / baseRetencion : 0,
    tasaChurn: baseRetencion > 0 ? enRiesgo / baseRetencion : 0
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Wrapper: trae las 3 métricas en paralelo (lo que llama el dashboard).
// ───────────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  emision: EmisionVsCanjeStats;
  topClientes: ClienteRanking[];
  retencion: RetencionStats;
}

export async function getDashboardStats(localId: string): Promise<DashboardStats> {
  const [emision, topClientes, retencion] = await Promise.all([
    calcularEmisionVsCanje(localId, 30),
    topClientesPorPuntos(localId, 5),
    calcularRetencion(localId, 60)
  ]);
  return { emision, topClientes, retencion };
}
