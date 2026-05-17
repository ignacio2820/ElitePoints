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
      const clienteSnap = await cols
        .cliente(db, localId, inv.clienteId)
        .get();

      if (!clienteSnap.exists) {
        resultado.errores.push(`${localId}/${token}: cliente inexistente`);
        continue;
      }

      const cliente = clienteSnap.data() as Cliente;
      const email = cliente.email?.trim();
      if (!email) {
        resultado.sinEmail += 1;
        continue;
      }

      const url = urlEncuestaPublica(localId, token);

      try {
        await enviarEmailEncuestaSatisfaccion({
          emailCliente: email,
          nombreCliente: cliente.nombre?.trim() || "Cliente",
          nombreLocal,
          urlEncuesta: url,
          huellitasRegalo: HUELLITAS_REGALO_ENCUESTA
        });

        await cols.invitacionEncuesta(db, localId, token).update({
          emailEnviado: true,
          emailEnviadoEn: new Date().toISOString()
        });

        resultado.emailsEnviados += 1;
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
