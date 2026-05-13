import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireCliente } from "@/lib/auth/server";
import {
  cancelarTicketCanje,
  crearTicketCanje
} from "@/lib/huellitas/canjeService";

export const runtime = "nodejs";

const CrearBody = z.object({
  premioId: z.string().min(1)
});

const CancelarBody = z.object({
  codigo: z.string().min(4).max(20)
});

/**
 * POST /api/canjes/ticket
 * Body: { premioId }
 *
 * Crea un canje pendiente: valida saldo, descuenta huellitas (FIFO en lotes)
 * y guarda el documento en `Locales/{localId}/Canjes` con estado `pendiente`.
 * El admin marca la entrega desde /admin/canjes.
 */
export async function POST(req: Request) {
  try {
    const sesion = await requireCliente();
    const raw = await req.json();
    const parsed = CrearBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos invalidos" },
        { status: 400 }
      );
    }
    const result = await crearTicketCanje({
      localId: sesion.claims.localId,
      clienteId: sesion.claims.clienteId,
      premioId: parsed.data.premioId
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

/**
 * DELETE /api/canjes/ticket
 * Body: { codigo }
 *
 * Permite al cliente cancelar su propio ticket pendiente (no canjeado).
 */
export async function DELETE(req: Request) {
  try {
    const sesion = await requireCliente();
    const raw = await req.json();
    const parsed = CancelarBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Codigo requerido" },
        { status: 400 }
      );
    }
    await cancelarTicketCanje({
      localId: sesion.claims.localId,
      clienteId: sesion.claims.clienteId,
      codigo: parsed.data.codigo
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
