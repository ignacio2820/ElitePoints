import { NextResponse } from "next/server";
import { z } from "zod";
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
    const json = await req.json();
    const data = Body.parse(json);
    const result = await registrarVenta(data);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
