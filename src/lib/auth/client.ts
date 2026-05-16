import {
  isSignInWithEmailLink,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut as fbSignOut,
  onIdTokenChanged,
  type User
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { redirectDesdeUrl } from "@/lib/auth/continueUrl";

const STORAGE_EMAIL_KEY = "huellitas:emailForSignIn";
const STORAGE_REDIRECT_KEY = "huellitas:redirectPostLogin";

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

export interface CheckEmailResponse {
  ok: boolean;
  error?: string;
  role?: "admin" | "cliente" | null;
  tienePassword?: boolean;
}

/** Detecta si el email es dueño, cliente o no registrado (para el login). */
export async function consultarRolEmail(
  email: string
): Promise<CheckEmailResponse> {
  try {
    const r = await fetch("/api/auth/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });
    const data = (await r.json()) as CheckEmailResponse;
    if (!r.ok || !data.ok) {
      return { ok: false, error: data.error ?? `Error ${r.status}` };
    }
    return data;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error de red"
    };
  }
}

async function intercambiarIdTokenPorSesion(
  idToken: string,
  redirect?: string
): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  const r = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, redirect })
  });
  const data = (await r.json()) as {
    ok: boolean;
    error?: string;
    redirectTo?: string;
  };
  if (!r.ok || !data.ok) {
    return { ok: false, error: data.error ?? "No se pudo crear la sesión" };
  }
  return { ok: true, redirectTo: data.redirectTo ?? "/" };
}

/**
 * Emite un ID token fresco y renueva la session cookie httpOnly.
 * Útil tras `updatePassword` / `linkWithCredential` para alinear cookies con Auth.
 */
export async function sincronizarSesionConFirebase(
  redirect?: string
): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  const u = auth.currentUser;
  if (!u) {
    return {
      ok: false,
      error: "No hay usuario de Firebase activo en este navegador."
    };
  }
  const idToken = await u.getIdToken(true);
  return intercambiarIdTokenPorSesion(idToken, redirect);
}

export interface IngresarPasswordInput {
  email: string;
  password: string;
  redirect?: string;
}

export interface IngresarPasswordResponse {
  ok: boolean;
  error?: string;
  redirectTo?: string;
}

/** Login del dueño con email + contraseña (Firebase Auth). */
export async function ingresarConPassword(
  input: IngresarPasswordInput
): Promise<IngresarPasswordResponse> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password) {
    return { ok: false, error: "Email y contraseña requeridos." };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, input.password);
    const idToken = await cred.user.getIdToken(true);
    const sesion = await intercambiarIdTokenPorSesion(idToken, input.redirect);
    if (!sesion.ok) {
      await fbSignOut(auth);
      return { ok: false, error: sesion.error };
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_EMAIL_KEY);
      window.localStorage.removeItem(STORAGE_REDIRECT_KEY);
    }
    return { ok: true, redirectTo: sesion.redirectTo };
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : "";
    if (
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password" ||
      code === "auth/user-not-found"
    ) {
      return {
        ok: false,
        error:
          "Email o contraseña incorrectos. Si nunca configuraste una contraseña, usá el link mágico o establecela en Configuración."
      };
    }
    if (code === "auth/too-many-requests") {
      return {
        ok: false,
        error: "Demasiados intentos. Esperá unos minutos e intentá de nuevo."
      };
    }
    const msg = e instanceof Error ? e.message : "Error al ingresar";
    return { ok: false, error: msg };
  }
}

export async function pedirMagicLink(
  input: PedirMagicLinkInput
): Promise<PedirMagicLinkResponse> {
  // Guardamos el email para recuperarlo en /login/verify (Firebase lo requiere).
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_EMAIL_KEY, input.email);
    if (input.redirect?.trim()) {
      window.localStorage.setItem(STORAGE_REDIRECT_KEY, input.redirect.trim());
    } else {
      window.localStorage.removeItem(STORAGE_REDIRECT_KEY);
    }
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
  localId: string;
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
    const redirect =
      redirectDesdeUrl(href) ??
      window.localStorage.getItem(STORAGE_REDIRECT_KEY) ??
      undefined;

    const sesion = await intercambiarIdTokenPorSesion(idToken, redirect);
    if (!sesion.ok) {
      await fbSignOut(auth);
      return { ok: false, error: sesion.error };
    }

    window.localStorage.removeItem(STORAGE_EMAIL_KEY);
    window.localStorage.removeItem(STORAGE_REDIRECT_KEY);
    return { ok: true, redirectTo: sesion.redirectTo };
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
  if (typeof window !== "undefined") {
    try {
      const borrar: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k?.startsWith("huellitas:")) borrar.push(k);
      }
      borrar.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // ignore
    }
    window.localStorage.removeItem(STORAGE_EMAIL_KEY);
    window.localStorage.removeItem(STORAGE_REDIRECT_KEY);
  }
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin"
  }).catch(() => {});
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export function onUserChanged(cb: (user: User | null) => void): () => void {
  return onIdTokenChanged(auth, cb);
}
