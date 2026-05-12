import { NextResponse } from "next/server";
import { z } from "zod";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";
import { destinoPostLogin } from "@/lib/auth/redirect";
import {
  crearSesionCookie,
  SESSION_COOKIE_OPTIONS
} from "@/lib/auth/server";
import { esRolValido, type Rol } from "@/lib/auth/types";

export const runtime = "nodejs";

const Body = z.object({
  idToken: z.string().min(10),
  redirect: z.string().optional()
});

async function claimsDesdeSesion(decoded: DecodedIdToken): Promise<{
  role: Rol;
  localId: string;
  clienteId?: string;
}> {
  let role = decoded.role;
  let localId = typeof decoded.localId === "string" ? decoded.localId : undefined;
  let clienteId =
    typeof decoded.clienteId === "string" ? decoded.clienteId : undefined;

  if (!esRolValido(role) || !localId) {
    const user = await adminAuth().getUser(decoded.uid);
    const claims = user.customClaims ?? {};
    role = claims.role;
    localId = typeof claims.localId === "string" ? claims.localId : undefined;
    clienteId =
      typeof claims.clienteId === "string" ? claims.clienteId : undefined;
  }

  if (!esRolValido(role) || !localId) {
    throw new Error("claims-missing");
  }

  return { role, localId, clienteId };
}

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
    let claims: Awaited<ReturnType<typeof claimsDesdeSesion>>;
    try {
      claims = await claimsDesdeSesion(decoded);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este usuario no tiene un rol asignado todavía. " +
            "Si sos cliente, asegurate de estar registrado en un local. " +
            "Si sos dueño, completá el onboarding o pedí acceso con `npm run set-admin`."
        },
        { status: 403 }
      );
    }

    const cookie = await crearSesionCookie(parsed.data.idToken);
    const res = NextResponse.json({
      ok: true,
      role: claims.role,
      localId: claims.localId,
      clienteId: claims.clienteId ?? null,
      redirectTo: destinoPostLogin(claims.role, parsed.data.redirect)
    });
    res.cookies.set({ ...SESSION_COOKIE_OPTIONS, value: cookie });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error verificando sesión";
    return NextResponse.json({ ok: false, error: msg }, { status: 401 });
  }
}
