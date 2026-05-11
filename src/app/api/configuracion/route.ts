import { NextResponse } from "next/server";
import { z } from "zod";
import { getConfiguracion, setConfiguracion } from "@/lib/huellitas/service";
import { ConfiguracionLocalSchema } from "@/lib/huellitas/types";

export const runtime = "nodejs";

const PartialCfg = ConfiguracionLocalSchema.partial().extend({
  localId: z.string().min(1)
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const localId = url.searchParams.get("localId");
  if (!localId) {
    return NextResponse.json({ ok: false, error: "localId requerido" }, { status: 400 });
  }
  const cfg = await getConfiguracion(localId);
  return NextResponse.json({ ok: true, configuracion: cfg });
}

export async function PUT(req: Request) {
  try {
    const data = PartialCfg.parse(await req.json());
    const { localId, ...rest } = data;
    const cfg = await setConfiguracion(localId, rest);
    return NextResponse.json({ ok: true, configuracion: cfg });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
