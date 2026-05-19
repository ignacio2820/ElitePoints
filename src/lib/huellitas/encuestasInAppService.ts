import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import {
  HUELLITAS_REGALO_ENCUESTA,
  UMBRAL_ALERTA_INSATISFACCION
} from "@/lib/huellitas/encuestasConstants";
import { dispararAlertaInsatisfaccionSiCorresponde } from "@/lib/huellitas/encuestasService";
import type { EncuestaRespuesta, InvitacionEncuesta } from "@/lib/huellitas/encuestasTypes";
import type {
  EncuestaSatisfaccionDoc,
  RespuestasEncuestaInApp
} from "@/lib/huellitas/encuestasInAppTypes";
import { leerHuellitasActuales } from "@/lib/huellitas/saldosCliente";
import { incrementHuellitasActuales } from "@/lib/huellitas/saldosCliente.server";

export type EncuestaPendienteInApp = {
  token: string;
  localId: string;
  ventaId: string;
  nombreLocal: string;
  nombreCliente: string;
  huellitasRegalo: number;
};

/** Convierte respuestas cerradas a puntuación 1–5 (compatible con alertas admin). */
export function puntuacionDesdeRespuestasInApp(
  r: RespuestasEncuestaInApp
): number {
  const atencion: Record<RespuestasEncuestaInApp["atencion"], number> = {
    excelente: 5,
    buena: 4,
    regular: 3,
    mala: 1
  };
  const tiempo: Record<RespuestasEncuestaInApp["tiempoEspera"], number> = {
    rapido: 5,
    normal: 3,
    largo: 1
  };
  const productos: Record<RespuestasEncuestaInApp["productos"], number> = {
    si_todo: 5,
    faltaron: 2
  };
  return Math.min(atencion[r.atencion], tiempo[r.tiempoEspera], productos[r.productos]);
}

export function esRespuestaInsatisfactoria(r: RespuestasEncuestaInApp): boolean {
  return (
    r.atencion === "mala" ||
    r.atencion === "regular" ||
    r.tiempoEspera === "largo" ||
    r.productos === "faltaron"
  );
}

/**
 * Busca la invitación post-compra más reciente pendiente y ya habilitada en app.
 */
export async function obtenerEncuestaPendienteInApp(
  localId: string,
  clienteId: string
): Promise<EncuestaPendienteInApp | null> {
  const db = adminDb();
  const snap = await cols
    .invitacionesEncuesta(db, localId)
    .where("clienteId", "==", clienteId)
    .where("estado", "==", "pendiente")
    .limit(20)
    .get();

  if (snap.empty) return null;

  const candidatas = snap.docs
    .map((d) => ({ id: d.id, data: d.data() as InvitacionEncuesta }))
    .filter((inv) => inv.data.disponibleEnApp !== false)
    .sort(
      (a, b) =>
        new Date(b.data.creadoEn ?? b.data.fechaVenta).getTime() -
        new Date(a.data.creadoEn ?? a.data.fechaVenta).getTime()
    );

  const elegida = candidatas[0];
  if (!elegida) return null;

  const [clienteSnap, localSnap] = await Promise.all([
    cols.cliente(db, localId, clienteId).get(),
    cols.local(db, localId).get()
  ]);

  return {
    token: elegida.id,
    localId,
    ventaId: elegida.data.ventaId,
    nombreLocal:
      String((localSnap.data() as { nombre?: string } | undefined)?.nombre ?? "").trim() ||
      "tu comercio",
    nombreCliente: String(clienteSnap.data()?.nombre ?? "Cliente").trim(),
    huellitasRegalo: HUELLITAS_REGALO_ENCUESTA
  };
}

export type ResultadoEnviarEncuestaInApp = {
  encuestaId: string;
  encuestaSatisfaccionId: string;
  huellitasRegalo: number;
  saldoFinal: number;
  yaCompletada: boolean;
};

export async function enviarEncuestaInApp(
  localId: string,
  clienteId: string,
  input: {
    token: string;
    respuestas: RespuestasEncuestaInApp;
    comentario?: string;
  }
): Promise<ResultadoEnviarEncuestaInApp & { alertaInsatisfaccion?: boolean; nombreCliente?: string; puntuacion?: number; comentario?: string }> {
  const db = adminDb();
  const invRef = cols.invitacionEncuesta(db, localId, input.token);
  const puntuacion = puntuacionDesdeRespuestasInApp(input.respuestas);
  const comentario = input.comentario?.trim() || undefined;

  const result = await db.runTransaction(async (tx) => {
    const invSnap = await tx.get(invRef);
    if (!invSnap.exists) {
      throw new Error("Encuesta no encontrada.");
    }

    const inv = invSnap.data() as InvitacionEncuesta;
    if (inv.clienteId !== clienteId) {
      throw new Error("No tenés permiso para esta encuesta.");
    }

    if (inv.estado === "completada" && inv.encuestaId) {
      const cliSnap = await tx.get(cols.cliente(db, localId, clienteId));
      return {
        encuestaId: inv.encuestaId,
        encuestaSatisfaccionId: inv.encuestaId,
        huellitasRegalo: HUELLITAS_REGALO_ENCUESTA,
        saldoFinal: leerHuellitasActuales(cliSnap.data() ?? {}),
        yaCompletada: true,
        nombreCliente: String(cliSnap.data()?.nombre ?? "Cliente").trim(),
        puntuacion,
        comentario
      };
    }

    const encuestaLocalRef = cols.encuestas(db, localId).doc();
    const encuestaGlobalRef = cols.encuestasSatisfaccion(db).doc();
    const clienteRef = cols.cliente(db, localId, clienteId);
    const clienteSnap = await tx.get(clienteRef);
    if (!clienteSnap.exists) {
      throw new Error("Cliente no encontrado.");
    }

    const saldoPrev = leerHuellitasActuales(clienteSnap.data() ?? {});
    const saldoFinal = saldoPrev + HUELLITAS_REGALO_ENCUESTA;
    const esInsatisfaccion =
      puntuacion < UMBRAL_ALERTA_INSATISFACCION ||
      esRespuestaInsatisfactoria(input.respuestas);

    const creadoEn = new Date().toISOString();

    const encuestaPayload: EncuestaRespuesta = {
      localId,
      clienteId,
      ventaId: inv.ventaId,
      token: input.token,
      puntuacion,
      comentario,
      respuestas: input.respuestas,
      canal: "in_app",
      huellitasRegalo: HUELLITAS_REGALO_ENCUESTA,
      creadoEn,
      ...(esInsatisfaccion
        ? { requiereAtencion: true, estado: "pendiente" as const }
        : { requiereAtencion: false })
    };

    const globalPayload: EncuestaSatisfaccionDoc = {
      localId,
      clienteId,
      ventaId: inv.ventaId,
      token: input.token,
      creadoEn,
      respuestas: input.respuestas,
      comentario,
      canal: "in_app",
      puntuacionDerivada: puntuacion,
      encuestaLocalId: encuestaLocalRef.id
    };

    tx.set(encuestaLocalRef, encuestaPayload);
    tx.set(encuestaGlobalRef, globalPayload);
    tx.update(invRef, {
      estado: "completada",
      encuestaId: encuestaLocalRef.id,
      completadaEnApp: true,
      completadaEn: creadoEn
    });
    tx.update(clienteRef, incrementHuellitasActuales(HUELLITAS_REGALO_ENCUESTA));

    const transRef = cols.transaccionesCliente(db, localId, clienteId).doc();
    tx.set(transRef, {
      tipo: "encuesta_satisfaccion",
      encuestaId: encuestaLocalRef.id,
      ventaId: inv.ventaId,
      descripcion: "Premio por Encuesta de Satisfacción (app)",
      huellitas: HUELLITAS_REGALO_ENCUESTA,
      saldoAnterior: saldoPrev,
      saldoPosterior: saldoFinal,
      puntuacion,
      creadoEn
    });

    return {
      encuestaId: encuestaLocalRef.id,
      encuestaSatisfaccionId: encuestaGlobalRef.id,
      huellitasRegalo: HUELLITAS_REGALO_ENCUESTA,
      saldoFinal,
      yaCompletada: false,
      alertaInsatisfaccion: esInsatisfaccion,
      nombreCliente: String(clienteSnap.data()?.nombre ?? "Cliente").trim(),
      puntuacion,
      comentario
    };
  });

  if (!result.yaCompletada && result.alertaInsatisfaccion) {
    dispararAlertaInsatisfaccionSiCorresponde(localId, {
      encuestaId: result.encuestaId,
      huellitasRegalo: result.huellitasRegalo,
      saldoFinal: result.saldoFinal,
      yaCompletada: false,
      alertaInsatisfaccion: true,
      nombreCliente: result.nombreCliente,
      puntuacion: result.puntuacion,
      comentario: result.comentario
    });
  }

  return result;
}
