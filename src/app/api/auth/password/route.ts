import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, getSesion, requireAdmin } from "@/lib/auth/server";
import {
  establecerPasswordUsuario,
  validarPasswordNueva
} from "@/lib/auth/password.server";

export const runtime = "nodejs";

const Body = z
  .object({
    password: z.string().min(8).max(128),
    confirmar: z.string().min(8).max(128)
  })
  .refine((d) => d.password === d.confirmar, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmar"]
  });

/**
 * GET: estado del proveedor "password".
 * POST: establece/clave sólo desde Admin SDK (útiles externos o scripts).
 * El panel usa el SDK web (`actualizarContraseñaDesdeCliente`) para mantener Auth y login alineados.
 */
export async function POST(req: Request) {
  try {
    const sesion = await requireAdmin();
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
    }

    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      const msg =
        parsed.error.issues[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    const errFmt = validarPasswordNueva(parsed.data.password);
    if (errFmt) {
      return NextResponse.json({ ok: false, error: errFmt }, { status: 400 });
    }

    await establecerPasswordUsuario(sesion.uid, parsed.data.password);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

/** Indica si el dueño ya configuró contraseña. */
export async function GET() {
  try {
    const sesion = await getSesion();
    if (!sesion || sesion.claims.role !== "admin") {
      return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
    }
    const user = await import("@/lib/firebase/admin").then((m) =>
      m.adminAuth().getUser(sesion.uid)
    );
    const tienePassword = user.providerData.some(
      (p) => p.providerId === "password"
    );
    return NextResponse.json({ ok: true, tienePassword });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
