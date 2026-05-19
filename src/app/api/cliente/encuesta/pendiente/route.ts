import { NextResponse } from "next/server";
import { ErrorAuth, requireCliente } from "@/lib/auth/server";
import { obtenerEncuestaPendienteInApp } from "@/lib/huellitas/encuestasInAppService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sesion = await requireCliente();
    const { localId, clienteId } = sesion.claims;
    if (!clienteId) {
      return NextResponse.json({ ok: false, reason: "sin-cliente" });
    }

    const encuesta = await obtenerEncuestaPendienteInApp(localId, clienteId);
    if (!encuesta) {
      return NextResponse.json({ ok: false, reason: "sin-pendiente" });
    }

    return NextResponse.json({ ok: true, encuesta });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
