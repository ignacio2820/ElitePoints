import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { crearPremio, listarPremiosAdmin } from "@/lib/huellitas/premiosService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  nombre: z.string().min(1).max(80),
  descripcion: z.string().max(280).optional(),
  costoHuellitas: z.number().int().positive(),
  valorDescuento: z
    .number()
    .nonnegative()
    .max(10_000_000)
    .nullable()
    .optional(),
  stock: z.number().int().nonnegative().nullable().optional(),
  nivelMinimoId: z.string().max(40).nullable().optional(),
  categoria: z
    .enum(["alimento", "juguete", "accesorio", "servicio", "otro"])
    .optional(),
  imagen: z.union([z.string().url(), z.null()]).optional(),
  activo: z.boolean().optional()
});

export async function GET() {
  try {
    const sesion = await requireAdmin();
    const premios = await listarPremiosAdmin(sesion.claims.localId);
    return NextResponse.json({ ok: true, premios });
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
    const premio = await crearPremio(sesion.claims.localId, parsed.data);
    return NextResponse.json({ ok: true, premio });
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
