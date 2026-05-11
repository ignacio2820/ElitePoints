import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";
import {
  COOKIE_SESION,
  DURACION_SESION_MS,
  esRolValido,
  type ClaimsHuellitas,
  type Rol,
  type SesionInfo
} from "./types";

/**
 * Helpers server-side para autenticación + RBAC.
 *
 * Usamos Firebase Session Cookies (NO ID tokens en localStorage):
 *  - Firmadas por Firebase, validadas con Admin SDK.
 *  - httpOnly + secure → invisibles a JS, resistentes a XSS.
 *  - Validables en server components, route handlers y middleware.
 */

function decodificarClaims(decoded: DecodedIdToken): ClaimsHuellitas | null {
  if (!esRolValido(decoded.role)) return null;
  if (typeof decoded.localId !== "string" || !decoded.localId) return null;
  const claims: ClaimsHuellitas = {
    role: decoded.role as Rol,
    localId: decoded.localId
  };
  if (typeof decoded.clienteId === "string" && decoded.clienteId) {
    claims.clienteId = decoded.clienteId;
  }
  return claims;
}

/**
 * Verifica la session cookie y devuelve la sesión decodificada.
 * Devuelve null si no hay sesión o la cookie es inválida/expirada.
 */
export async function getSesion(): Promise<SesionInfo | null> {
  const store = cookies();
  const cookie = store.get(COOKIE_SESION)?.value;
  if (!cookie) return null;

  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    const claims = decodificarClaims(decoded);
    if (!claims) return null;
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
      claims
    };
  } catch {
    return null;
  }
}

/** Garantiza que haya un admin logueado. Tira error si no. */
export async function requireAdmin(): Promise<SesionInfo & { claims: { role: "admin"; localId: string } }> {
  const s = await getSesion();
  if (!s) throw new ErrorAuth("No autenticado", 401);
  if (s.claims.role !== "admin") throw new ErrorAuth("Requiere rol admin", 403);
  return s as SesionInfo & { claims: { role: "admin"; localId: string } };
}

/** Garantiza que haya un cliente logueado. */
export async function requireCliente(): Promise<
  SesionInfo & { claims: { role: "cliente"; localId: string; clienteId: string } }
> {
  const s = await getSesion();
  if (!s) throw new ErrorAuth("No autenticado", 401);
  if (s.claims.role !== "cliente" || !s.claims.clienteId) {
    throw new ErrorAuth("Requiere rol cliente", 403);
  }
  return s as SesionInfo & {
    claims: { role: "cliente"; localId: string; clienteId: string };
  };
}

export class ErrorAuth extends Error {
  constructor(message: string, public readonly status: 401 | 403) {
    super(message);
    this.name = "ErrorAuth";
  }
}

/** Crea una session cookie a partir de un ID token recién emitido. */
export async function crearSesionCookie(idToken: string): Promise<string> {
  return adminAuth().createSessionCookie(idToken, {
    expiresIn: DURACION_SESION_MS
  });
}

export const SESSION_COOKIE_OPTIONS = {
  name: COOKIE_SESION,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: DURACION_SESION_MS / 1000
};

/**
 * Asigna custom claims a un usuario por UID. Idempotente.
 * SIEMPRE pisa todos los claims (no merge), así no quedan claims obsoletos.
 */
export async function setCustomClaims(uid: string, claims: ClaimsHuellitas): Promise<void> {
  await adminAuth().setCustomUserClaims(uid, claims as unknown as Record<string, unknown>);
}

/**
 * Encuentra un usuario por email; si no existe, lo crea (sin password).
 * Devuelve el UID. Útil para vincular un email al sistema antes del login.
 */
export async function getOrCreateUserByEmail(email: string): Promise<string> {
  const auth = adminAuth();
  try {
    const u = await auth.getUserByEmail(email);
    return u.uid;
  } catch {
    const u = await auth.createUser({
      email,
      emailVerified: false,
      disabled: false
    });
    return u.uid;
  }
}
