import { NextResponse } from "next/server";
import { ErrorAuth, requireCliente } from "@/lib/auth/server";
import { enviarEncuestaInApp } from "@/lib/huellitas/encuestasInAppService";
import { EnviarEncuestaInAppBodySchema } from "@/lib/huellitas/encuestasInAppTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const sesion = await requireCliente();
    const { localId, clienteId } = sesion.claims;
    if (!clienteId) {
      return NextResponse.json({ ok: false, error: "Sesión inválida" }, { status: 401 });
    }

    const json = await req.json();
    const body = EnviarEncuestaInAppBodySchema.parse(json);

    const result = await enviarEncuestaInApp(localId, clienteId, {
      token: body.token,
      respuestas: body.respuestas,
      comentario: body.comentario
    });

    return NextResponse.json({
      ok: true,
      huellitasRegalo: result.huellitasRegalo,
      saldoFinal: result.saldoFinal,
      yaCompletada: result.yaCompletada
    });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : "No se pudo enviar la encuesta.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
