import { NextResponse } from "next/server";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { listarClientes } from "@/lib/huellitas/clientesService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/clientes/buscar?q=texto
 * Devuelve hasta 100 clientes del local del admin, filtrados por nombre/email/teléfono/ID.
 */
export async function GET(req: Request) {
  try {
    const sesion = await requireAdmin();
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const clientes = await listarClientes(sesion.claims.localId, q, 100);
    return NextResponse.json({ ok: true, clientes });
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
