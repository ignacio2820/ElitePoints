import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { enviarEmailEncuestaSatisfaccion } from "@/lib/email/encuesta";
import { HUELLITAS_REGALO_ENCUESTA } from "@/lib/huellitas/encuestasConstants";
import type { InvitacionEncuesta } from "@/lib/huellitas/encuestasTypes";
import { urlEncuestaPublica } from "@/lib/huellitas/encuestasService";
import type { Cliente } from "@/lib/huellitas/types";

export type ResultadoCronEncuestas = {
  emailsEnviados: number;
  omitidos: number;
  sinEmail: number;
  errores: string[];
};

/**
 * Envía el correo de agradecimiento + encuesta para una invitación concreta.
 * Se invoca al registrar la venta (inmediato) y como respaldo desde el cron diario.
 */
export async function enviarEmailEncuestaInvitacion(
  localId: string,
  token: string
): Promise<"enviado" | "omitido" | "sin-email" | "desactivado"> {
  const db = adminDb();
  const cfgSnap = await cols.configuracion(db, localId).get();
  if (cfgSnap.data()?.emailsEncuestaActivos === false) {
    return "desactivado";
  }

  const invRef = cols.invitacionEncuesta(db, localId, token);
  const invSnap = await invRef.get();
  if (!invSnap.exists) return "omitido";

  const inv = invSnap.data() as InvitacionEncuesta & { emailEnviado?: boolean };
  if (inv.estado !== "pendiente" || inv.emailEnviado === true) {
    return "omitido";
  }

  const [clienteSnap, localSnap] = await Promise.all([
    cols.cliente(db, localId, inv.clienteId).get(),
    cols.local(db, localId).get()
  ]);
  if (!clienteSnap.exists) return "omitido";

  const email = (clienteSnap.data() as Cliente).email?.trim();
  if (!email) return "sin-email";

  const nombreLocal =
    String((localSnap.data() as { nombre?: string } | undefined)?.nombre ?? "").trim() ||
    "tu Pet Shop";

  await enviarEmailEncuestaSatisfaccion({
    emailCliente: email,
    nombreCliente:
      (clienteSnap.data() as Cliente).nombre?.trim() || "Cliente",
    nombreLocal,
    urlEncuesta: urlEncuestaPublica(localId, token),
    huellitasRegalo: HUELLITAS_REGALO_ENCUESTA
  });

  await invRef.update({
    emailEnviado: true,
    emailEnviadoEn: new Date().toISOString()
  });

  return "enviado";
}

/**
 * Envía por Resend el enlace de encuesta cuando `fechaEnvioEncuesta` ya venció.
 * Idempotente: `emailEnviado` en la invitación.
 */
export async function procesarEmailsEncuestasPendientes(
  ahora: Date = new Date()
): Promise<ResultadoCronEncuestas> {
  const db = adminDb();
  const ahoraMs = ahora.getTime();
  const resultado: ResultadoCronEncuestas = {
    emailsEnviados: 0,
    omitidos: 0,
    sinEmail: 0,
    errores: []
  };

  const locales = await db.collection("Locales").get();

  for (const localDoc of locales.docs) {
    const localId = localDoc.id;
    const cfgSnap = await cols.configuracion(db, localId).get();
    const cfg = cfgSnap.data() ?? {};
    if (cfg.emailsEncuestaActivos === false) continue;

    const nombreLocal =
      (localDoc.data() as { nombre?: string }).nombre ?? "tu Pet Shop";

    const invitaciones = await cols
      .invitacionesEncuesta(db, localId)
      .where("estado", "==", "pendiente")
      .limit(500)
      .get();

    for (const invDoc of invitaciones.docs) {
      const inv = invDoc.data() as InvitacionEncuesta & {
        emailEnviado?: boolean;
      };

      if (inv.emailEnviado === true) {
        resultado.omitidos += 1;
        continue;
      }

      const envioMs = inv.fechaEnvioEncuesta
        ? new Date(inv.fechaEnvioEncuesta).getTime()
        : 0;
      if (envioMs > ahoraMs) continue;

      const token = invDoc.id;

      try {
        const r = await enviarEmailEncuestaInvitacion(localId, token);
        if (r === "enviado") resultado.emailsEnviados += 1;
        else if (r === "sin-email") resultado.sinEmail += 1;
        else resultado.omitidos += 1;
      } catch (err) {
        resultado.errores.push(
          `${localId}/${token}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }

  return resultado;
}
