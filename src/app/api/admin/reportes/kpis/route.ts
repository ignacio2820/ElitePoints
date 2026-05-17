import { NextResponse } from "next/server";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { calcularKpisReportes } from "@/lib/huellitas/reportesService";
import {
  parseRangoReporte,
  resolverVentanaReporte
} from "@/lib/huellitas/reportesRango";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const sesion = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const rango = parseRangoReporte(searchParams.get("rango"));
    const ventana = resolverVentanaReporte(rango);
    const kpis = await calcularKpisReportes(sesion.claims.localId, ventana);

    return NextResponse.json({ ok: true, rango, ventana, kpis });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
