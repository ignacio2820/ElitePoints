import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import {
  actualizarMascotaAdmin,
  agregarMascotaAdmin,
  eliminarMascotaAdmin
} from "@/lib/huellitas/mascotasAdminService";
import { EspecieSchema } from "@/lib/huellitas/types";

export const runtime = "nodejs";

const PostBody = z.object({
  nombre: z.string().min(1).max(60),
  especie: EspecieSchema,
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
  raza: z.string().max(80).optional(),
  color: z.string().max(40).optional(),
  pesoKg: z.number().positive().max(300).optional()
});

const PatchBody = z.object({
  mascotaId: z.string().min(1),
  nombre: z.string().min(1).max(60).optional(),
  especie: EspecieSchema.optional(),
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  raza: z.string().max(80).optional(),
  color: z.string().max(40).optional(),
  pesoKg: z.number().positive().max(300).optional()
});

const DeleteBody = z.object({
  mascotaId: z.string().min(1)
});

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(
  req: Request,
  { params }: { params: { clienteId: string } }
) {
  try {
    const sesion = await requireAdmin();
    const clienteId = params.clienteId?.trim();
    if (!clienteId) {
      return NextResponse.json({ ok: false, error: "clienteId requerido" }, { status: 400 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = PostBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    if (parsed.data.fechaNacimiento > hoyIso()) {
      return NextResponse.json(
        { ok: false, error: "La fecha de nacimiento no puede ser futura." },
        { status: 400 }
      );
    }

    const mascota = await agregarMascotaAdmin(
      sesion.claims.localId,
      clienteId,
      parsed.data
    );
    return NextResponse.json({ ok: true, mascota });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { clienteId: string } }
) {
  try {
    const sesion = await requireAdmin();
    const clienteId = params.clienteId?.trim();
    if (!clienteId) {
      return NextResponse.json({ ok: false, error: "clienteId requerido" }, { status: 400 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    if (
      parsed.data.fechaNacimiento &&
      parsed.data.fechaNacimiento > hoyIso()
    ) {
      return NextResponse.json(
        { ok: false, error: "La fecha de nacimiento no puede ser futura." },
        { status: 400 }
      );
    }

    const mascotas = await actualizarMascotaAdmin(
      sesion.claims.localId,
      clienteId,
      parsed.data
    );
    return NextResponse.json({ ok: true, mascotas });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { clienteId: string } }
) {
  try {
    const sesion = await requireAdmin();
    const clienteId = params.clienteId?.trim();
    if (!clienteId) {
      return NextResponse.json({ ok: false, error: "clienteId requerido" }, { status: 400 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = DeleteBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "mascotaId requerido" }, { status: 400 });
    }

    const mascotas = await eliminarMascotaAdmin(
      sesion.claims.localId,
      clienteId,
      parsed.data.mascotaId
    );
    return NextResponse.json({ ok: true, mascotas });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
