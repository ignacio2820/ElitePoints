import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import {
  actualizarPremio,
  eliminarPremio,
  obtenerPremio
} from "@/lib/huellitas/premiosService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  nombre: z.string().min(1).max(80).optional(),
  descripcion: z.string().max(280).optional(),
  costoHuellitas: z.number().int().positive().optional(),
  stock: z.number().int().nonnegative().nullable().optional(),
  nivelMinimoId: z.string().max(40).nullable().optional(),
  categoria: z
    .enum(["alimento", "juguete", "accesorio", "servicio", "otro"])
    .optional(),
  imagen: z.string().url().nullable().optional(),
  activo: z.boolean().optional()
});

export async function PATCH(
  req: Request,
  { params }: { params: { premioId: string } }
) {
  try {
    const sesion = await requireAdmin();
    const localId = sesion.claims.localId;
    const premioId = params.premioId;
    const existente = await obtenerPremio(localId, premioId);
    if (!existente || existente.localId !== localId) {
      return NextResponse.json(
        { ok: false, error: "Premio no encontrado en este local." },
        { status: 404 }
      );
    }

    const raw = await req.json();
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const premio = await actualizarPremio(localId, premioId, parsed.data);
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

export async function DELETE(
  _req: Request,
  { params }: { params: { premioId: string } }
) {
  try {
    const sesion = await requireAdmin();
    const localId = sesion.claims.localId;
    const existente = await obtenerPremio(localId, params.premioId);
    if (!existente || existente.localId !== localId) {
      return NextResponse.json(
        { ok: false, error: "Premio no encontrado en este local." },
        { status: 404 }
      );
    }

    await eliminarPremio(localId, params.premioId);
    return NextResponse.json({ ok: true });
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
