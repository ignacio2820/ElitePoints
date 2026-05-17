import { enviarEmailAlertaEncuestaBaja } from "@/lib/email/encuestaAlerta";
import { getInfoLocal } from "@/lib/huellitas/localService";
import { enviarWhatsAppEncuestaAlerta } from "@/lib/notifications/whatsappEncuestaAlerta";

export type PayloadAlertaEncuestaBaja = {
  localId: string;
  encuestaId: string;
  nombreCliente: string;
  puntuacion: number;
  comentario?: string;
};

/**
 * Dispara alertas al dueño del local (email + webhook WhatsApp preparado).
 * No lanza error al caller: los fallos quedan en logs para reintento manual.
 */
export async function notificarAlertaEncuestaBaja(
  payload: PayloadAlertaEncuestaBaja
): Promise<void> {
  const mensaje = `⚠️ ALERTA: El cliente ${payload.nombreCliente} ha dejado una calificación baja.`;

  try {
    const local = await getInfoLocal(payload.localId);
    const emailDueno = local.email?.trim();

    if (emailDueno) {
      await enviarEmailAlertaEncuestaBaja({
        emailDueno,
        nombreLocal: local.nombre,
        nombreCliente: payload.nombreCliente,
        puntuacion: payload.puntuacion,
        comentario: payload.comentario,
        encuestaId: payload.encuestaId
      });
    } else {
      console.warn(
        `[encuesta-alerta] Local ${payload.localId} sin email de contacto.`
      );
    }

    if (local.telefonoWhatsapp?.trim()) {
      await enviarWhatsAppEncuestaAlerta({
        telefono: local.telefonoWhatsapp,
        mensaje,
        metadata: {
          localId: payload.localId,
          encuestaId: payload.encuestaId,
          puntuacion: String(payload.puntuacion)
        }
      });
    }
  } catch (err) {
    console.error("[encuesta-alerta] No se pudo notificar al dueño:", err);
  }

  console.info(`[encuesta-alerta] ${mensaje} (encuesta ${payload.encuestaId})`);
}
