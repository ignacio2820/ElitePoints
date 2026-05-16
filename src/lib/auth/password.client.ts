import {
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  updatePassword,
  type User
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

const PASSWORD_PROVIDER = EmailAuthProvider.PROVIDER_ID;

function codigoFirebase(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    return String((e as { code?: string }).code ?? "");
  }
  return "";
}

/**
 * Espera a que el SDK restaure el usuario persistido (IndexedDB).
 * La cookie de sesión del servidor no implica `auth.currentUser` hasta que corra Auth.
 */
export function esperarUsuarioAuth(timeoutMs = 5000): Promise<User | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    let done = false;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (done || !user) return;
      done = true;
      window.clearTimeout(t);
      unsubscribe();
      resolve(user);
    });
    const t = window.setTimeout(() => {
      if (done) return;
      done = true;
      unsubscribe();
      resolve(auth.currentUser);
    }, timeoutMs);
  });
}

function tieneProveedorPassword(user: User): boolean {
  return user.providerData.some((p) => p.providerId === PASSWORD_PROVIDER);
}

function mensajeErrorContraseña(code: string): string | null {
  switch (code) {
    case "auth/requires-recent-login":
      return "Por seguridad, Firebase pide volver a confirmar tu identidad. Ingresá tu contraseña actual en el campo correspondiente y guardá de nuevo.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "La contraseña actual no es correcta.";
    case "auth/weak-password":
      return "Elegí una contraseña más fuerte (Firebase la rechazó por ser débil).";
    case "auth/provider-already-linked":
      return "Tu cuenta ya tiene email/contraseña vinculados. Recargá la página e intentá de nuevo.";
    default:
      return null;
  }
}

export type ResultadoActualizarContraseñaCliente =
  | { ok: true }
  | { ok: false; error: string; codigoFirebase?: string };

/**
 * Actualiza o vincula la contraseña en Firebase Auth (SDK web).
 * No guarda la clave en Firestore: la fuente de verdad es Auth (como debe ser).
 */
export async function actualizarContraseñaDesdeCliente(input: {
  nuevaPassword: string;
  confirmarPassword: string;
  contraseñaActual?: string;
}): Promise<ResultadoActualizarContraseñaCliente> {
  const { nuevaPassword, confirmarPassword, contraseñaActual } = input;
  const p = nuevaPassword.trim();
  const c = confirmarPassword.trim();
  if (!p || p !== c) {
    return { ok: false, error: "Las contraseñas no coinciden." };
  }
  if (p.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (p.length > 128) {
    return { ok: false, error: "La contraseña es demasiado larga." };
  }

  const user = await esperarUsuarioAuth();
  if (!user?.email) {
    return {
      ok: false,
      error:
        "No hay sesión de Firebase en este navegador (solo la cookie del panel no alcanza). Cerrá sesión, volvé a entrar con el link mágico o tu contraseña, y repetí el cambio acá.",
      codigoFirebase: "auth/no-current-user-web"
    };
  }

  const email = user.email;

  async function aplicarUpdateConReauth(): Promise<void> {
    const tryUpdate = () => updatePassword(user, p);
    try {
      await tryUpdate();
    } catch (e) {
      const code = codigoFirebase(e);
      if (code === "auth/requires-recent-login") {
        const actual = contraseñaActual?.trim();
        if (!actual) {
          const msg = mensajeErrorContraseña(code);
          throw Object.assign(new Error(msg ?? "Requiere autenticación reciente"), {
            code
          });
        }
        await reauthenticateWithCredential(
          user,
          EmailAuthProvider.credential(email, actual)
        );
        await tryUpdate();
        return;
      }
      throw e;
    }
  }

  try {
    await user.reload();
    let passwordLinked = tieneProveedorPassword(user);

    if (!passwordLinked) {
      try {
        await linkWithCredential(
          user,
          EmailAuthProvider.credential(email, p)
        );
      } catch (e) {
        const cFb = codigoFirebase(e);
        if (cFb === "auth/provider-already-linked" || cFb === "auth/email-already-in-use") {
          await user.reload();
          passwordLinked = tieneProveedorPassword(user);
          if (!passwordLinked) throw e;
          await aplicarUpdateConReauth();
        } else if (cFb === "auth/requires-recent-login") {
          const actual = contraseñaActual?.trim();
          if (!actual) {
            return {
              ok: false,
              error:
                mensajeErrorContraseña(cFb) ??
                "Debés confirmar tu identidad con la contraseña actual antes de establecer una nueva.",
              codigoFirebase: cFb
            };
          }
          await reauthenticateWithCredential(
            user,
            EmailAuthProvider.credential(email, actual)
          );
          await linkWithCredential(
            user,
            EmailAuthProvider.credential(email, p)
          );
        } else {
          throw e;
        }
      }
    } else {
      await aplicarUpdateConReauth();
    }

    await user.getIdToken(true);
    return { ok: true };
  } catch (e) {
    const code = codigoFirebase(e);
    const mapped = mensajeErrorContraseña(code);
    if (mapped) {
      return { ok: false, error: mapped, codigoFirebase: code || undefined };
    }
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error: msg, codigoFirebase: code || undefined };
  }
}
