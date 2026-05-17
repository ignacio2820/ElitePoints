import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { finalizarSorteo } from "@/lib/huellitas/sorteosService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  sorteoId: z.string().min(1)
});

export async function POST(req: Request) {
  try {
    const sesion = await requireAdmin();
    const raw = await req.json().catch(() => null);
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "sorteoId requerido" },
        { status: 400 }
      );
    }

    const resultado = await finalizarSorteo(
      sesion.claims.localId,
      parsed.data.sorteoId
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
