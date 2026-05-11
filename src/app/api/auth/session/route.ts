import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase/admin";
import {
  crearSesionCookie,
  SESSION_COOKIE_OPTIONS
} from "@/lib/auth/server";
import { esRolValido } from "@/lib/auth/types";

export const runtime = "nodejs";

const Body = z.object({
  idToken: z.string().min(10)
});

/**
 * Recibe un ID token recién emitido por Firebase Auth (en el cliente)
 * y crea la session cookie httpOnly. Tras esto, todos los requests del
 * navegador llevan la cookie automáticamente.
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "idToken requerido" },
      { status: 400 }
    );
  }

  try {
    const decoded = await adminAuth().verifyIdToken(parsed.data.idToken, true);
    if (!esRolValido(decoded.role) || typeof decoded.localId !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este usuario no tiene un rol asignado todavía. " +
            "Si sos cliente, asegurate de estar registrado en un local. " +
            "Si sos dueño, pedí acceso con `npm run set-admin`."
        },
        { status: 403 }
      );
    }

    const cookie = await crearSesionCookie(parsed.data.idToken);
    const res = NextResponse.json({
      ok: true,
      role: decoded.role,
      localId: decoded.localId,
      clienteId: decoded.clienteId ?? null,
      redirectTo: decoded.role === "admin" ? "/admin" : "/mi-cuenta"
    });
    res.cookies.set({ ...SESSION_COOKIE_OPTIONS, value: cookie });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error verificando sesión";
    return NextResponse.json({ ok: false, error: msg }, { status: 401 });
  }
}
