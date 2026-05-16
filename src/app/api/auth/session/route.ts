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
import { assertAllowedAuthRequest } from "@/lib/auth/allowedOrigins";
import { buscarIdentidadPorEmail } from "@/lib/auth/identityIndex";
import { sincronizarSesionClientePorEmail } from "@/lib/auth/persistenciaCliente";

export const runtime = "nodejs";

const Body = z.object({
  idToken: z.string().min(10),
  redirect: z.string().optional(),
  /** Segunda pasada tras `getIdToken(true)` cuando los claims se actualizaron en servidor. */
  afterClaimsRefresh: z.boolean().optional()
});

async function claimsDesdeAuth(uid: string): Promise<{
  role: Rol;
  localId: string;
  clienteId?: string;
} | null> {
  const user = await adminAuth().getUser(uid);
  const claims = user.customClaims ?? {};
  const role = claims.role;
  const localId = typeof claims.localId === "string" ? claims.localId : undefined;
  const clienteId =
    typeof claims.clienteId === "string" ? claims.clienteId : undefined;

  if (!esRolValido(role) || !localId) return null;
  return { role, localId, clienteId };
}

function tokenCoincideConClaims(
  decoded: DecodedIdToken,
  auth: { role: Rol; localId: string; clienteId?: string }
): boolean {
  if (decoded.role !== auth.role || decoded.localId !== auth.localId) {
    return false;
  }
  if (auth.role === "cliente") {
    return decoded.clienteId === auth.clienteId;
  }
  return true;
}

/**
 * Recibe un ID token recién emitido por Firebase Auth (en el cliente)
 * y crea la session cookie httpOnly. Tras esto, todos los requests del
 * navegador llevan la cookie automáticamente.
 *
 * Si el email ya tiene perfil en Firestore, sincroniza claims y passkeys
 * antes de emitir la cookie (correo único tras reinstalar PWA).
 */
export async function POST(req: Request) {
  try {
    assertAllowedAuthRequest(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Origen no autorizado";
    return NextResponse.json({ ok: false, error: msg }, { status: 403 });
  }

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
    const userRecord = await adminAuth().getUser(decoded.uid);
    const email = (decoded.email ?? userRecord.email)?.trim().toLowerCase();

    if (email) {
      const identidad = await buscarIdentidadPorEmail(email);
      if (identidad?.tipo === "customer") {
        await sincronizarSesionClientePorEmail(
          decoded.uid,
          email,
          identidad.localId
        );
      }
    }

    const claims = await claimsDesdeAuth(decoded.uid);
    if (!claims) {
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

    if (
      !parsed.data.afterClaimsRefresh &&
      !tokenCoincideConClaims(decoded, claims)
    ) {
      return NextResponse.json({
        ok: true,
        needsFreshIdToken: true,
        role: claims.role,
        localId: claims.localId,
        clienteId: claims.clienteId ?? null
      });
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
