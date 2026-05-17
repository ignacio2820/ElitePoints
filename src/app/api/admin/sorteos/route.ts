import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import {
  crearSorteo,
  listarSorteosAdmin
} from "@/lib/huellitas/sorteosService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z.object({
  premio: z.string().min(1).max(120),
  descripcion: z.string().max(2000).default(""),
  imagen: z
    .string()
    .url()
    .max(8192)
    .optional()
    .or(z.literal("")),
  fechaHoraFin: z.string().min(1),
  nivelMinimo: z.string().min(1).max(40)
});

export async function GET() {
  try {
    const sesion = await requireAdmin();
    const sorteos = await listarSorteosAdmin(sesion.claims.localId);
    return NextResponse.json({ ok: true, sorteos });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sesion = await requireAdmin();
    const raw = await req.json().catch(() => null);
    const parsed = PostBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const sorteo = await crearSorteo(sesion.claims.localId, {
      ...parsed.data,
      imagen: parsed.data.imagen || undefined
    });
    return NextResponse.json({ ok: true, sorteo });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
