/** Utilidades WebAuthn solo para el navegador (no importar en server). */

export const PASSKEY_ERROR = {
  WEBAUTHN_UNAVAILABLE: "WEBAUTHN_UNAVAILABLE",
  NO_CREDENTIALS: "NO_CREDENTIALS",
  NOT_ENABLED: "NOT_ENABLED"
} as const;

export type PasskeyErrorCode =
  (typeof PASSKEY_ERROR)[keyof typeof PASSKEY_ERROR];

export const MENSAJE_SIN_PASSKEY =
  "Aún no registraste tu huella. Ingresá con tu email (link mágico o contraseña) una vez y activala en Configuración → Acceso con huella o passkey.";

export const MENSAJE_WEBAUTHN_NO_DISPONIBLE =
  "Tu navegador o dispositivo no admite huella digital en este sitio. Usá el link mágico o la contraseña.";

export function passkeysHabilitadosEnApp(): boolean {
  return process.env.NEXT_PUBLIC_WEBAUTHN_ENABLED === "true";
}

export function webAuthnDisponibleEnDispositivo(): {
  disponible: boolean;
  mensaje?: string;
} {
  if (typeof window === "undefined") {
    return { disponible: false, mensaje: MENSAJE_WEBAUTHN_NO_DISPONIBLE };
  }
  if (!passkeysHabilitadosEnApp()) {
    return { disponible: false, mensaje: "Passkeys no están habilitadas." };
  }
  if (
    typeof window.PublicKeyCredential === "undefined" ||
    typeof window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable !== "function"
  ) {
    return { disponible: false, mensaje: MENSAJE_WEBAUTHN_NO_DISPONIBLE };
  }
  return { disponible: true };
}

export interface EstadoPasskeyLogin {
  ok: boolean;
  tieneCredenciales?: boolean;
  webAuthnDisponible?: boolean;
  code?: PasskeyErrorCode;
  error?: string;
}

export async function consultarEstadoPasskeyLogin(
  email: string
): Promise<EstadoPasskeyLogin> {
  const web = webAuthnDisponibleEnDispositivo();
  if (!web.disponible) {
    return {
      ok: false,
      webAuthnDisponible: false,
      code: PASSKEY_ERROR.WEBAUTHN_UNAVAILABLE,
      error: web.mensaje
    };
  }

  try {
    const r = await fetch("/api/auth/passkey/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });
    const data = (await r.json()) as EstadoPasskeyLogin & {
      tieneCredenciales?: boolean;
    };
    return {
      ok: data.ok === true,
      tieneCredenciales: data.tieneCredenciales,
      webAuthnDisponible: true,
      code: data.code,
      error: data.error
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error de red"
    };
  }
}

export async function consultarPasskeySesionActual(): Promise<{
  ok: boolean;
  tieneCredenciales?: boolean;
}> {
  try {
    const r = await fetch("/api/auth/passkey/me", { cache: "no-store" });
    const data = await r.json();
    return {
      ok: data.ok === true,
      tieneCredenciales: data.tieneCredenciales === true
    };
  } catch {
    return { ok: false, tieneCredenciales: false };
  }
}

export function claveAvisoPasskeyDismiss(uid: string): string {
  return `mascotpoints:passkey-aviso:${uid}`;
}
