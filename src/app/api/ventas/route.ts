import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { assertAccesoOperativo } from "@/lib/huellitas/requireMembresiaActiva";
import { registrarVenta } from "@/lib/huellitas/service";

export const runtime = "nodejs";

const Body = z.object({
  localId: z.string().min(1),
  clienteId: z.string().min(1),
  totalVenta: z.number().nonnegative(),
  huellitasACanjear: z.number().int().nonnegative().optional()
});

export async function POST(req: Request) {
  try {
    const sesion = await requireAdmin();
    await assertAccesoOperativo(sesion.claims.localId);
    const json = await req.json();
    const data = Body.parse(json);
    if (data.localId !== sesion.claims.localId) {
      return NextResponse.json(
        { ok: false, error: "No podés registrar ventas en otro local." },
        { status: 403 }
      );
    }
    const result = await registrarVenta(data);
    return NextResponse.json({ ok: true, ...result });
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
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
