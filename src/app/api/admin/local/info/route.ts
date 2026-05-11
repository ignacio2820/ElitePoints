import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { getInfoLocal, membresiaActiva, setInfoLocal } from "@/lib/huellitas/localService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  nombre: z.string().min(1).max(120).optional(),
  logoUrl: z
    .union([z.string().trim().url().max(500), z.literal(""), z.null()])
    .optional(),
  telefonoWhatsapp: z
    .string()
    .max(30)
    .optional()
    .transform((s) => (typeof s === "string" ? s.replace(/[^0-9]/g, "") : s)),
  email: z.string().email().optional(),
  direccion: z.string().max(300).optional()
});

export async function GET() {
  try {
    const sesion = await requireAdmin();
    const info = await getInfoLocal(sesion.claims.localId);
    return NextResponse.json({
      ok: true,
      info,
      membresiaActiva: membresiaActiva(info)
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

export async function POST(req: Request) {
  try {
    const sesion = await requireAdmin();
    const raw = await req.json();
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos invalidos" },
        { status: 400 }
      );
    }
    const patch = { ...parsed.data };
    if (patch.logoUrl === "") {
      patch.logoUrl = null;
    }
    await setInfoLocal(sesion.claims.localId, patch);
    const info = await getInfoLocal(sesion.claims.localId);
    return NextResponse.json({
      ok: true,
      info,
      membresiaActiva: membresiaActiva(info)
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
