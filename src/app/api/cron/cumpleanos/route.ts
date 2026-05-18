import { NextResponse } from "next/server";
import { procesarRegalosCumpleanosDiarios } from "@/lib/huellitas/cumpleanosRegaloService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron diario (invocado desde `/api/cron/daily` — ver `vercel.json`).
 *
 * Para cada local con emails de cumpleaños activos:
 * - Mascotas que cumplen HOY (mes/día, sin año) reciben huellitas de regalo.
 * - Se registra transacción y email premium al dueño.
 * - Idempotente: `ultimoCumpleanosNotificado` en la mascota.
 *
 * Protección: `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }

  const resultado = await procesarRegalosCumpleanosDiarios();

  return NextResponse.json({
    ok: true,
    regalosOtorgados: resultado.regalosOtorgados,
    emailsEnviados: resultado.emailsEnviados,
    omitidos: resultado.omitidos,
    enviados: resultado.emailsEnviados,
    errores: resultado.errores
  });
}
