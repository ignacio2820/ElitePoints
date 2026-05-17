import { NextResponse } from "next/server";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { listarAlertasEncuestaPendientes } from "@/lib/huellitas/encuestasAlertasService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sesion = await requireAdmin();
    const alertas = await listarAlertasEncuestaPendientes(sesion.claims.localId);
    return NextResponse.json({ ok: true, alertas });
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
