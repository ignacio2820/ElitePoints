import { NextResponse } from "next/server";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { lookupPorCodigoCorto } from "@/lib/huellitas/clientesService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/clientes/lookup?q=ABC-123
 *
 * Resuelve un código corto al cliente. Pensado para que la caja resuelva
 * el cliente al toque sin recorrer toda la colección.
 *
 * Respuestas:
 *   200 { ok: true, cliente: ClienteResumen } — match exacto
 *   200 { ok: false, reason: "invalido" }     — la entrada no es un código
 *   200 { ok: false, reason: "no-encontrado" } — código válido pero no existe
 */
export async function GET(req: Request) {
  try {
    const sesion = await requireAdmin();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (!q) {
      return NextResponse.json({ ok: false, reason: "invalido" });
    }
    const cliente = await lookupPorCodigoCorto(sesion.claims.localId, q);
    if (!cliente) {
      return NextResponse.json({
        ok: false,
        reason: q.replace(/[^A-Za-z0-9-]/g, "").length === 0
          ? "invalido"
          : "no-encontrado"
      });
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
