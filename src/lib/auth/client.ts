import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as fbSignOut,
  onIdTokenChanged,
  type User
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

const STORAGE_EMAIL_KEY = "huellitas:emailForSignIn";

/**
 * Helpers client-side para el flujo de magic link + session cookie.
 *
 * Flujo:
 *  1. pedirMagicLink({ email, intent }) → endpoint server envía email con link.
 *  2. Usuario clickea el link → cae en /login/verify.
 *  3. completarLogin() detecta el link, firma con Firebase Auth y obtiene un
 *     idToken. Lo intercambia con /api/auth/session por una session cookie
 *     httpOnly. Devuelve a dónde redirigir.
 */

export interface PedirMagicLinkInput {
  email: string;
  /**
   * "auto" detecta automáticamente si el email es admin o cliente.
   * Se mantienen "admin" / "cliente" para forzar un intent específico.
   */
  intent?: "auto" | "cliente" | "admin";
  redirect?: string;
}

export interface PedirMagicLinkResponse {
  ok: boolean;
  error?: string;
  sent?: boolean;
  /** Rol final detectado por el server. */
  role?: "admin" | "cliente";
  /** En dev sin Resend, el server devuelve el link aquí. */
  devLink?: string;
}

export async function pedirMagicLink(
  input: PedirMagicLinkInput
): Promise<PedirMagicLinkResponse> {
  // Guardamos el email para recuperarlo en /login/verify (Firebase lo requiere).
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_EMAIL_KEY, input.email);
  }

  try {
    const r = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    const data: PedirMagicLinkResponse = await r.json();
    if (!r.ok || !data.ok) {
      return { ok: false, error: data.error ?? `Error ${r.status}` };
    }
    return data;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de red" };
  }
}

export interface RegistrarInput {
  email: string;
  nombre: string;
  telefono?: string;
  codigoReferido?: string;
  mascota: {
    nombre: string;
    especie: "perro" | "gato" | "ave" | "reptil" | "otro";
    raza?: string;
    fechaNacimiento?: string;
  };
}

export interface RegistrarResponse {
  ok: boolean;
  error?: string;
  sent?: boolean;
  devLink?: string;
  clienteId?: string;
  codigoReferido?: string;
}

export async function registrarseYRecibirMagicLink(
  input: RegistrarInput
): Promise<RegistrarResponse> {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_EMAIL_KEY, input.email);
  }
  try {
    const r = await fetch("/api/auth/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    const data: RegistrarResponse = await r.json();
    if (!r.ok || !data.ok) {
      return { ok: false, error: data.error ?? `Error ${r.status}` };
    }
    return data;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de red" };
  }
}

export interface CompletarLoginResult {
  ok: boolean;
  redirectTo?: string;
  error?: string;
  /** Indica que falta el email para completar el sign-in (otro navegador, etc.). */
  needsEmail?: boolean;
}

/**
 * Llamado desde /login/verify. Detecta el magic link en la URL,
 * firma con Firebase, y obtiene la session cookie httpOnly.
 *
 * Resiliencia: si localStorage no tiene el email guardado (p. ej. abriste el
 * link en otro navegador o en sesión privada), se lo pedimos al usuario.
 */
export async function completarLogin(
  href: string,
  emailExplicito?: string
): Promise<CompletarLoginResult> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Sólo se ejecuta en el cliente" };
  }

  if (!isSignInWithEmailLink(auth, href)) {
    return { ok: false, error: "Link inválido o expirado" };
  }

  let email = emailExplicito ?? window.localStorage.getItem(STORAGE_EMAIL_KEY);
  if (!email) {
    return {
      ok: false,
      error: "needs-email",
      needsEmail: true
    } as CompletarLoginResult;
  }
  email = email.trim().toLowerCase();

  try {
    const cred = await signInWithEmailLink(auth, email, href);
    const idToken = await cred.user.getIdToken(true);

    const r = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });
    const data = (await r.json()) as {
      ok: boolean;
      error?: string;
      redirectTo?: string;
    };
    if (!r.ok || !data.ok) {
      await fbSignOut(auth);
      return { ok: false, error: data.error ?? "No se pudo crear la sesión" };
    }

    window.localStorage.removeItem(STORAGE_EMAIL_KEY);
    return { ok: true, redirectTo: data.redirectTo ?? "/" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error: msg };
  }
}

export async function logout(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch {
    // ignore
  }
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export function onUserChanged(cb: (user: User | null) => void): () => void {
  return onIdTokenChanged(auth, cb);
}
