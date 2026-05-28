import { NextResponse } from "next/server";
import { procesarEmailsEncuestasPendientes } from "@/lib/huellitas/encuestasNotificacionService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron único diario (Vercel Hobby: 03:00 — ver `vercel.json`).
 * Encuestas pendientes; regalos de cumpleaños de mascotas eliminados en ElitePoints.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }

  const encuestas = await procesarEmailsEncuestasPendientes();

  return NextResponse.json({
    ok: true,
    encuestas: {
      emailsEnviados: encuestas.emailsEnviados,
      omitidos: encuestas.omitidos,
      sinEmail: encuestas.sinEmail,
      errores: encuestas.errores
    }
  });
}
