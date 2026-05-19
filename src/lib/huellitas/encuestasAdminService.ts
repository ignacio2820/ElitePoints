import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { etiquetasRespuestas } from "@/lib/huellitas/encuestasEtiquetas";
import type { EncuestaRespuesta } from "@/lib/huellitas/encuestasTypes";
import type { RespuestasEncuestaInApp } from "@/lib/huellitas/encuestasInAppTypes";

const LIMITE_LISTADO = 250;

export type EncuestaFeedbackAdmin = {
  encuestaId: string;
  clienteId: string;
  nombreCliente: string;
  puntuacion: number;
  comentario?: string;
  creadoEn: string;
  ventaId: string;
  canal?: string;
  respuestas?: RespuestasEncuestaInApp;
  etiquetas: {
    atencion: string;
    tiempoEspera: string;
    productos: string;
  };
  requiereAtencion: boolean;
  estadoAtencion?: string;
};

export type ResumenFeedbackEncuestas = {
  total: number;
  conComentario: number;
  atencionRegularOMala: number;
  esperaLarga: number;
  productosFaltantes: number;
};

export async function listarFeedbackEncuestas(
  localId: string
): Promise<{ items: EncuestaFeedbackAdmin[]; resumen: ResumenFeedbackEncuestas }> {
  const db = adminDb();
  let snap;
  try {
    snap = await cols
      .encuestas(db, localId)
      .orderBy("creadoEn", "desc")
      .limit(LIMITE_LISTADO)
      .get();
  } catch {
    snap = await cols.encuestas(db, localId).limit(LIMITE_LISTADO).get();
  }

  const docs = [...snap.docs].sort((a, b) => {
    const ta = new Date(
      (a.data() as EncuestaRespuesta).creadoEn ?? 0
    ).getTime();
    const tb = new Date(
      (b.data() as EncuestaRespuesta).creadoEn ?? 0
    ).getTime();
    return tb - ta;
  });

  const clienteCache = new Map<string, string>();
  const items: EncuestaFeedbackAdmin[] = [];

  for (const doc of docs) {
    const data = doc.data() as EncuestaRespuesta;
    let nombre = clienteCache.get(data.clienteId);
    if (!nombre) {
      const cli = await cols.cliente(db, localId, data.clienteId).get();
      nombre = String(cli.data()?.nombre ?? "Cliente").trim();
      clienteCache.set(data.clienteId, nombre);
    }

    items.push({
      encuestaId: doc.id,
      clienteId: data.clienteId,
      nombreCliente: nombre,
      puntuacion: data.puntuacion,
      comentario: data.comentario,
      creadoEn: data.creadoEn ?? "",
      ventaId: data.ventaId,
      canal: data.canal,
      respuestas: data.respuestas,
      etiquetas: etiquetasRespuestas(data.respuestas),
      requiereAtencion: data.requiereAtencion === true,
      estadoAtencion: data.estado
    });
  }

  const resumen: ResumenFeedbackEncuestas = {
    total: items.length,
    conComentario: items.filter((i) => i.comentario?.trim()).length,
    atencionRegularOMala: items.filter(
      (i) =>
        i.respuestas?.atencion === "regular" || i.respuestas?.atencion === "mala"
    ).length,
    esperaLarga: items.filter((i) => i.respuestas?.tiempoEspera === "largo").length,
    productosFaltantes: items.filter((i) => i.respuestas?.productos === "faltaron")
      .length
  };

  return { items, resumen };
}

/** Elimina la encuesta del local y su copia en `encuestas_satisfaccion` si existe. */
export async function eliminarEncuestaAdmin(
  localId: string,
  encuestaId: string
): Promise<void> {
  const db = adminDb();
  const ref = cols.encuesta(db, localId, encuestaId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Encuesta no encontrada.");
  }

  await ref.delete();

  const global = await cols
    .encuestasSatisfaccion(db)
    .where("localId", "==", localId)
    .where("encuestaLocalId", "==", encuestaId)
    .limit(10)
    .get();

  await Promise.all(global.docs.map((d) => d.ref.delete()));
}
