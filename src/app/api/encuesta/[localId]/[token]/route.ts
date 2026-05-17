import { NextResponse } from "next/server";
import {
  dispararAlertaInsatisfaccionSiCorresponde,
  enviarEncuestaYRecompensar,
  obtenerVistaEncuesta
} from "@/lib/huellitas/encuestasService";
import { EnviarEncuestaBodySchema } from "@/lib/huellitas/encuestasTypes";

export const runtime = "nodejs";

type Params = { localId: string; token: string };

export async function GET(
  _req: Request,
  { params }: { params: Params }
) {
  const vista = await obtenerVistaEncuesta(params.localId, params.token);
  if (!vista) {
    return NextResponse.json(
      { ok: false, error: "Enlace no válido." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, vista });
}

export async function POST(
  req: Request,
  { params }: { params: Params }
) {
  try {
    const json = await req.json();
    const body = EnviarEncuestaBodySchema.parse(json);
    const result = await enviarEncuestaYRecompensar(
      params.localId,
      params.token,
      body
    );
    dispararAlertaInsatisfaccionSiCorresponde(params.localId, result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "No se pudo enviar la encuesta.";
    const status = msg.includes("no está disponible") ? 403 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
