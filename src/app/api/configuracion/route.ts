import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { getConfiguracion, setConfiguracion } from "@/lib/huellitas/service";
import { ConfiguracionLocalSchema } from "@/lib/huellitas/types";

export const runtime = "nodejs";

const PartialCfg = ConfiguracionLocalSchema.partial();

export async function GET() {
  try {
    const sesion = await requireAdmin();
    const cfg = await getConfiguracion(sesion.claims.localId);
    return NextResponse.json({ ok: true, configuracion: cfg });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const sesion = await requireAdmin();
    const body = PartialCfg.parse(await req.json());
    const { localId: _ignorado, ...rest } = body;
    const cfg = await setConfiguracion(sesion.claims.localId, rest);
    return NextResponse.json({ ok: true, configuracion: cfg });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    if (err instanceof ErrorAuth) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
