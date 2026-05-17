import { randomBytes } from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { appBaseUrlForAuth } from "@/lib/auth/continueUrl";
import {
  ENCUESTA_DELAY_MS,
  HUELLITAS_REGALO_ENCUESTA,
  UMBRAL_ALERTA_INSATISFACCION
} from "@/lib/huellitas/encuestasConstants";
import { notificarAlertaEncuestaBaja } from "@/lib/notifications/encuestaAlerta";
import type {
  EncuestaRespuesta,
  InvitacionEncuesta
} from "@/lib/huellitas/encuestasTypes";
import { leerHuellitasActuales } from "@/lib/huellitas/saldosCliente";
import { incrementHuellitasActuales } from "@/lib/huellitas/saldosCliente.server";

export function generarTokenEncuesta(): string {
  return randomBytes(24).toString("base64url");
}

export function urlEncuestaPublica(localId: string, token: string): string {
  return `${appBaseUrlForAuth()}/encuesta/${encodeURIComponent(localId)}/${encodeURIComponent(token)}`;
}

/**
 * Programa invitación 24 h después de una venta con huellitas emitidas.
 * El enlace queda en `Locales/{localId}/InvitacionesEncuesta/{token}`.
 */
export async function programarInvitacionEncuesta(input: {
  localId: string;
  clienteId: string;
  ventaId: string;
  fechaVenta?: Date;
}): Promise<{ token: string; url: string; fechaEnvioEncuesta: string }> {
  const db = adminDb();
  const token = generarTokenEncuesta();
  const base = input.fechaVenta ?? new Date();
  const fechaEnvio = new Date(base.getTime() + ENCUESTA_DELAY_MS);

  const payload: InvitacionEncuesta = {
    token,
    localId: input.localId,
    clienteId: input.clienteId,
    ventaId: input.ventaId,
    fechaVenta: base.toISOString(),
    fechaEnvioEncuesta: fechaEnvio.toISOString(),
    estado: "pendiente",
    creadoEn: new Date().toISOString()
  };

  await cols.invitacionEncuesta(db, input.localId, token).set(payload);

  return {
    token,
    url: urlEncuestaPublica(input.localId, token),
    fechaEnvioEncuesta: payload.fechaEnvioEncuesta
  };
}

export type VistaEncuestaPublica = {
  token: string;
  localId: string;
  nombreLocal: string;
  nombreCliente: string;
  disponible: boolean;
  completada: boolean;
  expirada: boolean;
  fechaEnvioEncuesta: string;
  huellitasRegalo: number;
};

export async function obtenerVistaEncuesta(
  localId: string,
  token: string
): Promise<VistaEncuestaPublica | null> {
  const db = adminDb();
  const snap = await cols.invitacionEncuesta(db, localId, token).get();
  if (!snap.exists) return null;

  const inv = snap.data() as InvitacionEncuesta;
  const [clienteSnap, localSnap] = await Promise.all([
    cols.cliente(db, localId, inv.clienteId).get(),
    cols.local(db, localId).get()
  ]);

  const nombreCliente = String(clienteSnap.data()?.nombre ?? "Cliente").trim();
  const nombreLocal =
    String((localSnap.data() as { nombre?: string } | undefined)?.nombre ?? "").trim() ||
    "tu Pet Shop";

  const ahora = Date.now();
  const envio = new Date(inv.fechaEnvioEncuesta).getTime();
  const completada = inv.estado === "completada";
  const disponible = !completada && ahora >= envio;
  const expirada =
    inv.estado === "expirada" ||
    (!completada && ahora > envio + 30 * 24 * 60 * 60_000);

  return {
    token,
    localId,
    nombreLocal,
    nombreCliente,
    disponible,
    completada,
    expirada,
    fechaEnvioEncuesta: inv.fechaEnvioEncuesta,
    huellitasRegalo: HUELLITAS_REGALO_ENCUESTA
  };
}

export type ResultadoEnviarEncuesta = {
  encuestaId: string;
  huellitasRegalo: number;
  saldoFinal: number;
  yaCompletada: boolean;
};

export type ResultadoEnviarEncuestaExtendido = ResultadoEnviarEncuesta & {
  alertaInsatisfaccion?: boolean;
  nombreCliente?: string;
  puntuacion?: number;
  comentario?: string;
};


export async function enviarEncuestaYRecompensar(
  localId: string,
  token: string,
  input: { puntuacion: number; comentario?: string }
): Promise<ResultadoEnviarEncuestaExtendido> {
  const db = adminDb();
  const invRef = cols.invitacionEncuesta(db, localId, token);

  return db.runTransaction(async (tx) => {
    const invSnap = await tx.get(invRef);
    if (!invSnap.exists) {
      throw new Error("Encuesta no encontrada o enlace inválido.");
    }

    const inv = invSnap.data() as InvitacionEncuesta;

    if (inv.estado === "completada" && inv.encuestaId) {
      const cliSnap = await tx.get(cols.cliente(db, localId, inv.clienteId));
      return {
        encuestaId: inv.encuestaId,
        huellitasRegalo: HUELLITAS_REGALO_ENCUESTA,
        saldoFinal: leerHuellitasActuales(cliSnap.data() ?? {}),
        yaCompletada: true
      };
    }

    const ahora = Date.now();
    if (ahora < new Date(inv.fechaEnvioEncuesta).getTime()) {
      throw new Error(
        "Tu encuesta todavía no está disponible. Volvé a intentar más tarde."
      );
    }

    const encuestaRef = cols.encuestas(db, localId).doc();
    const clienteRef = cols.cliente(db, localId, inv.clienteId);
    const clienteSnap = await tx.get(clienteRef);
    if (!clienteSnap.exists) {
      throw new Error("Cliente no encontrado.");
    }

    const saldoPrev = leerHuellitasActuales(clienteSnap.data() ?? {});
    const saldoFinal = saldoPrev + HUELLITAS_REGALO_ENCUESTA;

    const esInsatisfaccion = input.puntuacion < UMBRAL_ALERTA_INSATISFACCION;
    const encuestaPayload: EncuestaRespuesta = {
      localId,
      clienteId: inv.clienteId,
      ventaId: inv.ventaId,
      token,
      puntuacion: input.puntuacion,
      comentario: input.comentario?.trim() || undefined,
      huellitasRegalo: HUELLITAS_REGALO_ENCUESTA,
      creadoEn: new Date().toISOString(),
      ...(esInsatisfaccion
        ? { requiereAtencion: true, estado: "pendiente" as const }
        : { requiereAtencion: false })
    };

    tx.set(encuestaRef, encuestaPayload);
    tx.update(invRef, {
      estado: "completada",
      encuestaId: encuestaRef.id
    });
    tx.update(clienteRef, incrementHuellitasActuales(HUELLITAS_REGALO_ENCUESTA));

    const transRef = cols
      .transaccionesCliente(db, localId, inv.clienteId)
      .doc();
    tx.set(transRef, {
      tipo: "encuesta_satisfaccion",
      encuestaId: encuestaRef.id,
      ventaId: inv.ventaId,
      descripcion: "Premio por Encuesta de Satisfacción",
      huellitas: HUELLITAS_REGALO_ENCUESTA,
      saldoAnterior: saldoPrev,
      saldoPosterior: saldoFinal,
      puntuacion: input.puntuacion,
      creadoEn: new Date().toISOString()
    });

    return {
      encuestaId: encuestaRef.id,
      huellitasRegalo: HUELLITAS_REGALO_ENCUESTA,
      saldoFinal,
      yaCompletada: false,
      alertaInsatisfaccion: esInsatisfaccion,
      nombreCliente: String(clienteSnap.data()?.nombre ?? "Cliente").trim(),
      puntuacion: input.puntuacion,
      comentario: input.comentario?.trim()
    };
  });
}

/** Side-effect post-transacción: alerta al dueño si la puntuación fue baja. */
export function dispararAlertaInsatisfaccionSiCorresponde(
  localId: string,
  result: ResultadoEnviarEncuestaExtendido
): void {
  if (result.yaCompletada || !result.alertaInsatisfaccion || !result.encuestaId) {
    return;
  }
  void notificarAlertaEncuestaBaja({
    localId,
    encuestaId: result.encuestaId,
    nombreCliente: result.nombreCliente ?? "Cliente",
    puntuacion: result.puntuacion ?? 1,
    comentario: result.comentario
  }).catch((err) => {
    console.error("[encuesta] Falló alerta al dueño:", err);
  });
}
