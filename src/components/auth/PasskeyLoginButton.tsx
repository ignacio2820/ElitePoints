"use client";

import { useState } from "react";
import Link from "next/link";
import { Fingerprint, Loader2, X } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { auth } from "@/lib/firebase/client";
import { signInWithCustomToken } from "firebase/auth";
import {
  consultarEstadoPasskeyLogin,
  MENSAJE_SIN_PASSKEY,
  MENSAJE_WEBAUTHN_NO_DISPONIBLE,
  PASSKEY_ERROR,
  passkeysHabilitadosEnApp,
  webAuthnDisponibleEnDispositivo
} from "@/lib/auth/passkeys.client";

interface Props {
  email: string;
  disabled?: boolean;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export function PasskeyLoginButton({
  email,
  disabled,
  onSuccess,
  onError
}: Props) {
  const [cargando, setCargando] = useState(false);
  const [avisoSinPasskey, setAvisoSinPasskey] = useState(false);
  const [avisoWebAuthn, setAvisoWebAuthn] = useState<string | null>(null);

  if (!passkeysHabilitadosEnApp()) {
    return null;
  }

  async function onClick() {
    if (!email.trim()) {
      onError("Ingresá tu email primero.");
      return;
    }

    setAvisoSinPasskey(false);
    setAvisoWebAuthn(null);
    onError("");

    const web = webAuthnDisponibleEnDispositivo();
    if (!web.disponible) {
      setAvisoWebAuthn(web.mensaje ?? MENSAJE_WEBAUTHN_NO_DISPONIBLE);
      return;
    }

    setCargando(true);
    try {
      const estado = await consultarEstadoPasskeyLogin(email.trim());
      if (!estado.ok || !estado.tieneCredenciales) {
        if (
          estado.code === PASSKEY_ERROR.NO_CREDENTIALS ||
          estado.tieneCredenciales === false
        ) {
          setAvisoSinPasskey(true);
          return;
        }
        if (estado.code === PASSKEY_ERROR.WEBAUTHN_UNAVAILABLE) {
          setAvisoWebAuthn(estado.error ?? MENSAJE_WEBAUTHN_NO_DISPONIBLE);
          return;
        }
        onError(estado.error ?? MENSAJE_SIN_PASSKEY);
        return;
      }

      const optRes = await fetch("/api/auth/passkey/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const optData = await optRes.json();
      if (!optRes.ok || !optData.ok) {
        if (optData.code === "NO_CREDENTIALS") {
          setAvisoSinPasskey(true);
          return;
        }
        onError(optData.error ?? MENSAJE_SIN_PASSKEY);
        return;
      }

      const assertion = await startAuthentication({
        optionsJSON: optData.options
      });

      const verifyRes = await fetch("/api/auth/passkey/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          response: assertion
        })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.ok || !verifyData.customToken) {
        throw new Error(verifyData.error ?? "Verificación fallida.");
      }

      const cred = await signInWithCustomToken(auth, verifyData.customToken);
      const idToken = await cred.user.getIdToken();

      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData.ok) {
        throw new Error(sessionData.error ?? "No pudimos crear la sesión.");
      }

      window.location.href = sessionData.redirectTo ?? "/";
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error con passkey";
      if (
        msg.toLowerCase().includes("passkey") ||
        msg.toLowerCase().includes("credential")
      ) {
        setAvisoSinPasskey(true);
      } else {
        onError(msg);
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={disabled || cargando}
        className="btn-ghost inline-flex w-full items-center justify-center gap-2 text-sm"
      >
        {cargando ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Fingerprint size={16} />
        )}
        Ingresar con huella o passkey
      </button>

      {avisoWebAuthn ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          {avisoWebAuthn}
        </p>
      ) : null}

      {avisoSinPasskey ? (
        <div
          className="rounded-xl border border-bark-200 bg-cream-50 p-4 text-sm text-bark-700"
          role="alert"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="leading-relaxed">{MENSAJE_SIN_PASSKEY}</p>
            <button
              type="button"
              onClick={() => setAvisoSinPasskey(false)}
              className="shrink-0 rounded-full p-1 text-bark-400 hover:bg-bark-100"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
          <Link
            href="/login"
            className="mt-3 inline-block text-xs font-semibold text-terracotta-500 hover:underline"
            onClick={() => setAvisoSinPasskey(false)}
          >
            Usar link mágico o contraseña
          </Link>
        </div>
      ) : null}
    </div>
  );
}
