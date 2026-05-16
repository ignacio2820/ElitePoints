import {
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  updatePassword,
  type User
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import {
  ensureAuthPersistence,
  esperarUsuarioFirebase
} from "@/lib/auth/persistence";

const PASSWORD_PROVIDER = EmailAuthProvider.PROVIDER_ID;

function codigoFirebase(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    return String((e as { code?: string }).code ?? "");
  }
  return "";
}

function tieneProveedorPassword(user: User): boolean {
  return user.providerData.some((p) => p.providerId === PASSWORD_PROVIDER);
}

function mensajeErrorContraseña(code: string): string | null {
  switch (code) {
    case "auth/requires-recent-login":
      return "Por seguridad, ingresá tu contraseña actual en el campo correspondiente y guardá de nuevo.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "La contraseña actual no es correcta.";
    case "auth/weak-password":
      return "Elegí una contraseña más fuerte (mínimo 8 caracteres).";
    case "auth/provider-already-linked":
      return null;
    default:
      return null;
  }
}

export type ResultadoActualizarContraseñaCliente =
  | { ok: true }
  | { ok: false; error: string; codigoFirebase?: string };

/**
 * Cambio de contraseña estándar de Firebase Auth (única fuente de verdad).
 * - Ya tiene password: `updatePassword` (+ reauth si hace falta).
 * - Solo magic link: `linkWithCredential` la primera vez.
 * No usa Admin SDK (evita desincronizar el hash y romper el login).
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

  await ensureAuthPersistence();

  const user = await esperarUsuarioFirebase(10_000);
  if (!user?.email) {
    return {
      ok: false,
      error:
        "Para cambiar la contraseña necesitás una sesión activa de Firebase en este navegador. " +
        "Cerrá sesión, entrá una vez con el link mágico (o con tu clave actual) y volvé a Configuración.",
      codigoFirebase: "auth/no-current-user-web"
    };
  }

  const email = user.email;

  try {
    await user.reload();

    if (tieneProveedorPassword(user)) {
      try {
        await updatePassword(user, p);
      } catch (e) {
        const code = codigoFirebase(e);
        if (code !== "auth/requires-recent-login") {
          throw e;
        }
        const actual = contraseñaActual?.trim();
        if (!actual) {
          return {
            ok: false,
            error:
              mensajeErrorContraseña(code) ??
              "Debés confirmar tu contraseña actual antes de establecer una nueva.",
            codigoFirebase: code
          };
        }
        await reauthenticateWithCredential(
          user,
          EmailAuthProvider.credential(email, actual)
        );
        await updatePassword(user, p);
      }
    } else {
      try {
        await linkWithCredential(
          user,
          EmailAuthProvider.credential(email, p)
        );
      } catch (e) {
        const code = codigoFirebase(e);
        if (
          code === "auth/provider-already-linked" ||
          code === "auth/credential-already-in-use"
        ) {
          await user.reload();
          await updatePassword(user, p);
        } else if (code === "auth/requires-recent-login") {
          const actual = contraseñaActual?.trim();
          if (!actual) {
            return {
              ok: false,
              error: mensajeErrorContraseña(code) ?? "Requiere autenticación reciente.",
              codigoFirebase: code
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
