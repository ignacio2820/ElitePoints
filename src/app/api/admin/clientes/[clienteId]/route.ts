import { NextResponse } from "next/server";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { getCliente } from "@/lib/huellitas/clientesService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/clientes/{clienteId}
 * Resuelve un cliente por ID de documento (independiente del límite de búsqueda por texto).
 */
export async function GET(
  _req: Request,
  { params }: { params: { clienteId: string } }
) {
  try {
    const sesion = await requireAdmin();
    const clienteId = params.clienteId?.trim();
    if (!clienteId) {
      return NextResponse.json(
        { ok: false, error: "Falta el ID del cliente." },
        { status: 400 }
      );
    }
    const cliente = await getCliente(sesion.claims.localId, clienteId);
    if (!cliente) {
      return NextResponse.json(
        { ok: false, error: "Cliente no encontrado en este local." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, cliente });
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
