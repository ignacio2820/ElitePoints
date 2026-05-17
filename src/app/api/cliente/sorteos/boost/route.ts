import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireCliente } from "@/lib/auth/server";
import { comprarBoostSorteo } from "@/lib/huellitas/sorteosService";

export const runtime = "nodejs";

const Body = z.object({
  sorteoId: z.string().min(1),
  tipo: z.enum(["duplicar", "triplicar"])
});

export async function POST(req: Request) {
  try {
    const sesion = await requireCliente();
    const raw = await req.json().catch(() => null);
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const resultado = await comprarBoostSorteo(
      sesion.claims.localId,
      sesion.claims.clienteId,
      parsed.data.sorteoId,
      parsed.data.tipo
    );

    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
