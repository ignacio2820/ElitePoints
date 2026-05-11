import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { confirmarTicketCanje } from "@/lib/huellitas/canjeService";

export const runtime = "nodejs";

const Body = z.object({
  codigo: z
    .string()
    .min(4)
    .max(20)
    .transform((s) => s.trim().toUpperCase())
});

export async function POST(req: Request) {
  try {
    const sesion = await requireAdmin();
    const raw = await req.json();
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Código requerido" },
        { status: 400 }
      );
    }
    const result = await confirmarTicketCanje({
      localId: sesion.claims.localId,
      codigo: parsed.data.codigo,
      adminUid: sesion.uid
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
