import {
  enviarEmailGanadorSorteo,
  enviarEmailLanzamientoSorteo
} from "@/lib/email/sorteos";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { getConfiguracion } from "@/lib/huellitas/service";
import { labelFiltroNivel } from "@/lib/huellitas/sorteosUtils";
import type { ClienteElegibleSorteo } from "@/lib/huellitas/sorteosTypes";
import type { Sorteo } from "@/lib/huellitas/sorteosTypes";
import {
  enviarWhatsAppSorteo,
  mensajeWhatsAppLanzamientoSorteo
} from "@/lib/notifications/whatsappSorteo";

async function obtenerNombreLocal(localId: string): Promise<string> {
  const snap = await cols.local(adminDb(), localId).get();
  return String(snap.data()?.nombre ?? localId).trim() || localId;
}

export type ResumenNotificacionLanzamiento = {
  emailsEnviados: number;
  emailsOmitidos: number;
  whatsappEnviados: number;
  whatsappOmitidos: number;
  errores: number;
};

/**
 * Dispara emails y WhatsApp en segundo plano tras crear un sorteo.
 * No bloquea la respuesta HTTP del admin.
 */
export async function notificarLanzamientoSorteo(params: {
  localId: string;
  sorteo: Sorteo;
  elegibles: ClienteElegibleSorteo[];
}): Promise<ResumenNotificacionLanzamiento> {
  const { localId, sorteo, elegibles } = params;
  const nombreLocal = await obtenerNombreLocal(localId);
  const cfg = await getConfiguracion(localId);
  const nivelLabel = labelFiltroNivel(sorteo.nivelMinimo, cfg.niveles);

  const resumen: ResumenNotificacionLanzamiento = {
    emailsEnviados: 0,
    emailsOmitidos: 0,
    whatsappEnviados: 0,
    whatsappOmitidos: 0,
    errores: 0
  };

  await Promise.allSettled(
    elegibles.map(async (c) => {
      const email = c.email.trim();
      if (email) {
        try {
          await enviarEmailLanzamientoSorteo({
            email,
            nombreCliente: c.nombre,
            nombreLocal,
            premio: sorteo.premio,
            descripcion: sorteo.descripcion,
            fechaCierre: sorteo.fechaHoraFin,
            nivelLabel
          });
          resumen.emailsEnviados += 1;
        } catch (err) {
          resumen.errores += 1;
          console.error("[sorteos] email lanzamiento", c.clienteId, err);
        }
      } else {
        resumen.emailsOmitidos += 1;
      }

      const telefono = c.telefono.trim();
      if (!telefono) {
        resumen.whatsappOmitidos += 1;
        return;
      }

      const wa = await enviarWhatsAppSorteo({
        telefono,
        nombre: c.nombre,
        nombreLocal,
        mensaje: mensajeWhatsAppLanzamientoSorteo(c.nombre),
        metadata: {
          sorteoId: sorteo.id ?? "",
          localId,
          tipo: "sorteo_lanzamiento"
        }
      });

      if (wa.enviado) resumen.whatsappEnviados += 1;
      else if (wa.omitido) resumen.whatsappOmitidos += 1;
      else {
        resumen.errores += 1;
        console.error("[sorteos] whatsapp lanzamiento", c.clienteId, wa.error);
      }
    })
  );

  return resumen;
}

export async function notificarGanadorSorteo(params: {
  localId: string;
  ganadorId: string;
  ganadorNombre: string;
  premio: string;
  descripcion: string;
}): Promise<boolean> {
  const { localId, ganadorId, ganadorNombre, premio, descripcion } = params;
  const snap = await cols.cliente(adminDb(), localId, ganadorId).get();
  if (!snap.exists) return false;

  const email = String(snap.data()?.email ?? "").trim();
  if (!email) return false;

  const nombreLocal = await obtenerNombreLocal(localId);
  await enviarEmailGanadorSorteo({
    email,
    nombreGanador: ganadorNombre,
    nombreLocal,
    premio,
    descripcion
  });
  return true;
}
