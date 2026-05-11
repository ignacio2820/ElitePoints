import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { enviarEmailCumpleanos } from "@/lib/email/cumpleanos";
import { esCumpleanos } from "@/lib/huellitas/engine";
import type { Cliente, Mascota } from "@/lib/huellitas/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron diario (sugerido: 09:00 hora local del comercio).
 *
 * Recorre todos los locales con `emailsCumpleanosActivos === true`,
 * encuentra mascotas que cumplen HOY y envía el email al cliente.
 *
 * Idempotente: marca `ultimoCumpleanosNotificado = YYYY-MM-DD` en la mascota
 * para evitar duplicados si el cron se reintenta.
 *
 * Protección: requiere header `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }

  const db = adminDb();
  const hoy = new Date();
  const hoyISO = hoy.toISOString().slice(0, 10);

  const locales = await db.collection("Locales").get();
  let enviados = 0;
  let omitidos = 0;
  const errores: string[] = [];

  for (const localDoc of locales.docs) {
    const localId = localDoc.id;
    const cfgSnap = await cols.configuracion(db, localId).get();
    const cfg = cfgSnap.data() ?? {};
    if (cfg.emailsCumpleanosActivos === false) continue;

    const nombreLocal = (localDoc.data() as { nombre?: string }).nombre ?? "tu Pet Shop";

    const clientes = await cols.clientes(db, localId).get();
    for (const cDoc of clientes.docs) {
      const cliente = cDoc.data() as Cliente;
      if (!cliente.email) continue;

      const mascotas = await cols.mascotas(db, localId, cDoc.id).get();
      for (const mDoc of mascotas.docs) {
        const mascota = { id: mDoc.id, ...(mDoc.data() as Mascota) };
        if (!esCumpleanos(mascota, hoy)) continue;
        if (mascota.ultimoCumpleanosNotificado === hoyISO) {
          omitidos++;
          continue;
        }

        try {
          await enviarEmailCumpleanos({
            emailCliente: cliente.email,
            nombreCliente: cliente.nombre,
            mascota,
            nombreLocal
          });
          await mDoc.ref.update({ ultimoCumpleanosNotificado: hoyISO });
          enviados++;
        } catch (e) {
          errores.push(
            `${localId}/${cDoc.id}/${mDoc.id}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
    }
  }

  return NextResponse.json({ ok: true, enviados, omitidos, errores });
}
