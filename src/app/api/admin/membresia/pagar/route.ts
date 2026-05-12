import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { esPlanPagoPublico } from "@/lib/huellitas/membresia.shared";
import { activarMembresiaSimulada } from "@/lib/huellitas/membresia.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  plan: z.string().refine(esPlanPagoPublico, "Plan de pago inválido")
});

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

    const { fechaVencimiento } = await activarMembresiaSimulada(
      sesion.claims.localId,
      parsed.data.plan
    );

    return NextResponse.json({
      ok: true,
      estadoMembresia: "activo",
      membresiaEstado: "activo",
      fechaVencimiento: fechaVencimiento.toISOString()
    });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
