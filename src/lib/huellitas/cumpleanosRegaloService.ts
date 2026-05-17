import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { enviarEmailCumpleanos } from "@/lib/email/cumpleanos";
import { esCumpleanos } from "@/lib/huellitas/engine";
import { fusionarMascotasCliente } from "@/lib/huellitas/fusionarMascotasCliente";
import { leerHuellitasActuales } from "@/lib/huellitas/saldosCliente";
import { incrementHuellitasActuales } from "@/lib/huellitas/saldosCliente.server";
import type { Cliente, Mascota } from "@/lib/huellitas/types";

import { HUELLITAS_REGALO_CUMPLEANOS } from "@/lib/huellitas/cumpleanosConstants";

export { HUELLITAS_REGALO_CUMPLEANOS };

export type ResultadoCronCumpleanos = {
  regalosOtorgados: number;
  emailsEnviados: number;
  omitidos: number;
  errores: string[];
};

/**
 * Cron diario: mascotas que cumplen HOY reciben huellitas, transacción y email.
 * Idempotente vía `ultimoCumpleanosNotificado` (YYYY-MM-DD) en la mascota.
 */
export async function procesarRegalosCumpleanosDiarios(
  hoy: Date = new Date()
): Promise<ResultadoCronCumpleanos> {
  const db = adminDb();
  const hoyISO = hoy.toISOString().slice(0, 10);
  const resultado: ResultadoCronCumpleanos = {
    regalosOtorgados: 0,
    emailsEnviados: 0,
    omitidos: 0,
    errores: []
  };

  const locales = await db.collection("Locales").get();

  for (const localDoc of locales.docs) {
    const localId = localDoc.id;
    const cfgSnap = await cols.configuracion(db, localId).get();
    const cfg = cfgSnap.data() ?? {};
    if (cfg.emailsCumpleanosActivos === false) continue;

    const nombreLocal =
      (localDoc.data() as { nombre?: string }).nombre ?? "tu Pet Shop";

    const clientes = await cols.clientes(db, localId).get();

    for (const cDoc of clientes.docs) {
      const cliente = cDoc.data() as Cliente;
      const clienteRef = cols.cliente(db, localId, cDoc.id);

      const embebidas = (cliente.mascotas ?? []) as Mascota[];
      let subcoleccion: Mascota[] = [];
      try {
        const mascotasSnap = await cols.mascotas(db, localId, cDoc.id).get();
        subcoleccion = mascotasSnap.docs.map((mDoc) => ({
          id: mDoc.id,
          ...(mDoc.data() as Mascota)
        }));
      } catch {
        // legacy sin subcolección
      }

      const mascotas = fusionarMascotasCliente(embebidas, subcoleccion);

      for (const mascota of mascotas) {
        if (!mascota.fechaNacimiento || !esCumpleanos(mascota, hoy)) continue;
        if (mascota.ultimoCumpleanosNotificado === hoyISO) {
          resultado.omitidos += 1;
          continue;
        }

        const mascotaId = mascota.id;
        if (!mascotaId) {
          resultado.errores.push(`${localId}/${cDoc.id}: mascota sin id`);
          continue;
        }

        try {
          await db.runTransaction(async (tx) => {
            const cliSnap = await tx.get(clienteRef);
            if (!cliSnap.exists) throw new Error("Cliente no encontrado");

            const saldoPrev = leerHuellitasActuales(cliSnap.data() ?? {});
            tx.update(clienteRef, incrementHuellitasActuales(HUELLITAS_REGALO_CUMPLEANOS));

            const transRef = cols
              .transaccionesCliente(db, localId, cDoc.id)
              .doc();
            tx.set(transRef, {
              tipo: "regalo_cumpleanos_mascota",
              mascotaId,
              nombreMascota: mascota.nombre,
              descripcion: `Regalo de Cumpleaños para ${mascota.nombre}`,
              huellitas: HUELLITAS_REGALO_CUMPLEANOS,
              saldoAnterior: saldoPrev,
              saldoPosterior: saldoPrev + HUELLITAS_REGALO_CUMPLEANOS,
              creadoEn: new Date().toISOString()
            });

            const mascotaRef = cols.mascota(db, localId, cDoc.id, mascotaId);
            const mSnap = await tx.get(mascotaRef);
            if (mSnap.exists) {
              tx.update(mascotaRef, { ultimoCumpleanosNotificado: hoyISO });
            }
          });

          resultado.regalosOtorgados += 1;

          if (cliente.email) {
            try {
              await enviarEmailCumpleanos({
                emailCliente: cliente.email,
                nombreCliente: cliente.nombre,
                mascota,
                nombreLocal,
                huellitasRegalo: HUELLITAS_REGALO_CUMPLEANOS
              });
              resultado.emailsEnviados += 1;
            } catch (mailErr) {
              resultado.errores.push(
                `email ${localId}/${cDoc.id}/${mascotaId}: ${
                  mailErr instanceof Error ? mailErr.message : String(mailErr)
                }`
              );
            }
          }
        } catch (e) {
          resultado.errores.push(
            `${localId}/${cDoc.id}/${mascotaId}: ${
              e instanceof Error ? e.message : String(e)
            }`
          );
        }
      }
    }
  }

  return resultado;
}
