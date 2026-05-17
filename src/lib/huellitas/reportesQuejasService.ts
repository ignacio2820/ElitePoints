import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { UMBRAL_ALERTA_INSATISFACCION } from "@/lib/huellitas/encuestasConstants";
import type { EncuestaRespuesta } from "@/lib/huellitas/encuestasTypes";
import {
  CATEGORIAS_QUEJA,
  clasificarComentarioQueja,
  type CategoriaQuejaId
} from "@/lib/huellitas/quejasCategorias";
import {
  resolverVentanaReporte,
  type RangoReporte,
  type VentanaReporte
} from "@/lib/huellitas/reportesRango";

const LIMITE_ENCUESTAS = 5000;

export type ReportesQuejasKpis = {
  tiempoPromedioRespuestaHoras: number | null;
  tasaResolucionPct: number;
  alertasPendientes: number;
};

export type PuntoQuejasMensual = {
  clave: string;
  label: string;
  recibidas: number;
  resueltas: number;
};

export type SegmentoCategoriaQueja = {
  categoriaId: CategoriaQuejaId;
  nombre: string;
  cantidad: number;
  porcentaje: number;
  color: string;
};

export type ReportesQuejasCompletos = {
  ventana: VentanaReporte;
  kpis: ReportesQuejasKpis;
  serieMensual: PuntoQuejasMensual[];
  categorias: SegmentoCategoriaQueja[];
};

function toDate(val: unknown): Date | null {
  if (val == null) return null;
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date && !Number.isNaN(val.getTime())) return val;
  if (typeof val === "string" && val.trim()) {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function enVentana(fecha: Date | null, ventana: VentanaReporte): boolean {
  if (!fecha) return false;
  return (
    fecha.getTime() >= ventana.desde.getTime() &&
    fecha.getTime() <= ventana.hasta.getTime()
  );
}

function esQuejaNegativa(data: EncuestaRespuesta): boolean {
  return (
    data.requiereAtencion === true ||
    data.puntuacion < UMBRAL_ALERTA_INSATISFACCION
  );
}

function msVentana(ventana: VentanaReporte): number {
  return ventana.hasta.getTime() - ventana.desde.getTime();
}

/** Buckets diarios (< 45 días de ventana) o mensuales. */
function generarBuckets(ventana: VentanaReporte): PuntoQuejasMensual[] {
  const ms = msVentana(ventana);
  const usarMensual = ms > 45 * 24 * 60 * 60 * 1000;
  const buckets: PuntoQuejasMensual[] = [];

  if (usarMensual) {
    const cursor = new Date(ventana.desde.getFullYear(), ventana.desde.getMonth(), 1);
    while (cursor.getTime() <= ventana.hasta.getTime()) {
      const clave = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("es-AR", {
        month: "short",
        year: "2-digit"
      }).format(cursor);
      buckets.push({ clave, label, recibidas: 0, resueltas: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }

  const cursor = new Date(ventana.desde);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= ventana.hasta.getTime()) {
    const clave = cursor.toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat("es-AR", {
      day: "numeric",
      month: "short"
    }).format(cursor);
    buckets.push({ clave, label, recibidas: 0, resueltas: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
}

function claveBucket(fecha: Date, ventana: VentanaReporte): string {
  const ms = msVentana(ventana);
  if (ms > 45 * 24 * 60 * 60 * 1000) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
  }
  return fecha.toISOString().slice(0, 10);
}

export async function obtenerReportesQuejas(
  localId: string,
  rango: RangoReporte,
  ahora: Date = new Date()
): Promise<ReportesQuejasCompletos> {
  const db = adminDb();
  const ventana = resolverVentanaReporte(rango, ahora);

  const snap = await cols
    .encuestas(db, localId)
    .where("requiereAtencion", "==", true)
    .limit(LIMITE_ENCUESTAS)
    .get();

  const quejas = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as EncuestaRespuesta) }))
    .filter(esQuejaNegativa);

  let alertasPendientes = 0;
  let recibidasVentana = 0;
  let resueltasVentana = 0;
  let sumaMsRespuesta = 0;
  let conteoRespuesta = 0;

  const serieMensual = generarBuckets(ventana);
  const indiceBucket = new Map(serieMensual.map((b, i) => [b.clave, i]));

  const conteoCategoria = new Map<CategoriaQuejaId, number>();
  for (const cat of CATEGORIAS_QUEJA) {
    conteoCategoria.set(cat.id, 0);
  }

  for (const q of quejas) {
    if (q.estado === "pendiente" || (!q.estado && !q.resueltoEn)) {
      alertasPendientes += 1;
    }

    const creado = toDate(q.creadoEn);
    const resuelto = toDate(q.resueltoEn);
    const enPeriodo = enVentana(creado, ventana);

    if (enPeriodo) {
      recibidasVentana += 1;
      const cat = clasificarComentarioQueja(q.comentario);
      conteoCategoria.set(cat, (conteoCategoria.get(cat) ?? 0) + 1);

      if (creado) {
        const k = claveBucket(creado, ventana);
        const idx = indiceBucket.get(k);
        if (idx !== undefined) serieMensual[idx].recibidas += 1;
      }
    }

    if (q.estado === "resuelta" && resuelto && creado) {
      if (enPeriodo) {
        resueltasVentana += 1;
        sumaMsRespuesta += resuelto.getTime() - creado.getTime();
        conteoRespuesta += 1;
      }
      const kRes = claveBucket(resuelto, ventana);
      const idxRes = indiceBucket.get(kRes);
      if (idxRes !== undefined) serieMensual[idxRes].resueltas += 1;
    }
  }

  const tiempoPromedioRespuestaHoras =
    conteoRespuesta > 0
      ? sumaMsRespuesta / conteoRespuesta / (1000 * 60 * 60)
      : null;

  const tasaResolucionPct =
    recibidasVentana > 0
      ? Math.round((resueltasVentana / recibidasVentana) * 1000) / 10
      : 0;

  const totalCat = recibidasVentana || 1;
  const categorias: SegmentoCategoriaQueja[] = CATEGORIAS_QUEJA.map((cat) => {
    const cantidad = conteoCategoria.get(cat.id) ?? 0;
    return {
      categoriaId: cat.id,
      nombre: cat.nombre,
      cantidad,
      porcentaje: recibidasVentana > 0 ? (cantidad / totalCat) * 100 : 0,
      color: cat.color
    };
  }).filter((c) => c.cantidad > 0 || recibidasVentana === 0);

  return {
    ventana,
    kpis: {
      tiempoPromedioRespuestaHoras,
      tasaResolucionPct,
      alertasPendientes
    },
    serieMensual,
    categorias:
      categorias.length > 0
        ? categorias
        : CATEGORIAS_QUEJA.map((cat) => ({
            categoriaId: cat.id,
            nombre: cat.nombre,
            cantidad: 0,
            porcentaje: 0,
            color: cat.color
          }))
  };
}
