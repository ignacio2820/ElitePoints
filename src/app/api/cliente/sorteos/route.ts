import { NextResponse } from "next/server";
import { ErrorAuth, requireCliente } from "@/lib/auth/server";
import { listarSorteosParaCliente } from "@/lib/huellitas/sorteosService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sesion = await requireCliente();
    const sorteos = await listarSorteosParaCliente(
      sesion.claims.localId,
      sesion.claims.clienteId
    );
    return NextResponse.json({ ok: true, sorteos });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
