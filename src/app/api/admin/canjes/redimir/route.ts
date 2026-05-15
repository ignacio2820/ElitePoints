import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { handleRedemption } from "@/lib/huellitas/redemptionService";

export const runtime = "nodejs";

const Body = z.object({
  clienteId: z.string().min(1),
  premioId: z.string().min(1)
});

/**
 * Canje manual en caja: descuenta huellitas, stock y registra en logs_canjes.
 */
export async function POST(req: Request) {
  try {
    const sesion = await requireAdmin();
    const raw = await req.json();
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const result = await handleRedemption({
      localId: sesion.claims.localId,
      clienteId: parsed.data.clienteId,
      premioId: parsed.data.premioId,
      origen: "manual",
      adminUid: sesion.uid
    });

    return NextResponse.json(result);
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
