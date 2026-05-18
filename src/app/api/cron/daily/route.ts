import { NextResponse } from "next/server";
import { procesarRegalosCumpleanosDiarios } from "@/lib/huellitas/cumpleanosRegaloService";
import { procesarEmailsEncuestasPendientes } from "@/lib/huellitas/encuestasNotificacionService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron único diario (Vercel Hobby: 03:00 — ver `vercel.json`).
 * Ejecuta cumpleaños + encuestas pendientes en una sola invocación.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }

  const [cumpleanos, encuestas] = await Promise.all([
    procesarRegalosCumpleanosDiarios(),
    procesarEmailsEncuestasPendientes()
  ]);

  return NextResponse.json({
    ok: true,
    cumpleanos: {
      regalosOtorgados: cumpleanos.regalosOtorgados,
      emailsEnviados: cumpleanos.emailsEnviados,
      omitidos: cumpleanos.omitidos,
      errores: cumpleanos.errores
    },
    encuestas: {
      emailsEnviados: encuestas.emailsEnviados,
      omitidos: encuestas.omitidos,
      sinEmail: encuestas.sinEmail,
      errores: encuestas.errores
    }
  });
}
