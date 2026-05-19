import { NextResponse } from "next/server";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import {
  lookupPorCodigoCorto,
  lookupPorIdentificadorBarras
} from "@/lib/huellitas/clientesService";
import { esCodigoClienteValido } from "@/lib/huellitas/codigosClientes";
import { esEntradaIdentificadorBarras } from "@/lib/huellitas/identificadorBarras";
import { assertAccesoOperativo } from "@/lib/huellitas/requireMembresiaActiva";

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
    await assertAccesoOperativo(sesion.claims.localId);
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (!q) {
      return NextResponse.json({ ok: false, reason: "invalido" });
    }
    let cliente = null;
    if (esCodigoClienteValido(q)) {
      cliente = await lookupPorCodigoCorto(sesion.claims.localId, q);
    } else if (esEntradaIdentificadorBarras(q)) {
      cliente = await lookupPorIdentificadorBarras(sesion.claims.localId, q);
    }
    if (!cliente) {
      const invalido =
        q.replace(/[^A-Za-z0-9-]/g, "").length === 0 &&
        !esEntradaIdentificadorBarras(q);
      return NextResponse.json({
        ok: false,
        reason: invalido ? "invalido" : "no-encontrado"
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
    if (err instanceof Error && err.message === "MEMBRESIA_REQUERIDA") {
      return NextResponse.json(
        { ok: false, error: "Activá tu membresía para usar la caja." },
        { status: 402 }
      );
    }
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
