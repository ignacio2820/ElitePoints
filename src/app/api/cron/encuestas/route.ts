import { NextResponse } from "next/server";
import { procesarEmailsEncuestasPendientes } from "@/lib/huellitas/encuestasNotificacionService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron diario: envía por Resend el enlace de encuesta cuando venció
 * `fechaEnvioEncuesta` (24 h post-compra). Idempotente con `emailEnviado`.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }

  const resultado = await procesarEmailsEncuestasPendientes();

  return NextResponse.json({
    ok: true,
    emailsEnviados: resultado.emailsEnviados,
    omitidos: resultado.omitidos,
    sinEmail: resultado.sinEmail,
    errores: resultado.errores
  });
}
