"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Fingerprint, Loader2, X } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { auth } from "@/lib/firebase/client";
import { signInWithCustomToken } from "firebase/auth";
import { guardarUltimoEmail } from "@/lib/auth/ultimoEmail";
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
  redirect?: string;
  disabled?: boolean;
  /** Estilo destacado para clientes en PWA */
  variant?: "primary" | "ghost";
  /** Intenta huella automáticamente al abrir (email ya guardado) */
  autoIntentar?: boolean;
  onSuccess?: () => void;
  onError: (msg: string) => void;
}

export function PasskeyLoginButton({
  email,
  redirect,
  disabled,
  variant = "ghost",
  autoIntentar = false,
  onSuccess,
  onError
}: Props) {
  const [cargando, setCargando] = useState(false);
  const [avisoSinPasskey, setAvisoSinPasskey] = useState(false);
  const [avisoWebAuthn, setAvisoWebAuthn] = useState<string | null>(null);
  const [tienePasskey, setTienePasskey] = useState<boolean | null>(null);
  const autoIntentado = useRef(false);
  const habilitado = passkeysHabilitadosEnApp();

  const emailNorm = email.trim().toLowerCase();

  useEffect(() => {
    if (!emailNorm || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailNorm)) {
      setTienePasskey(null);
      return;
    }
    let cancelado = false;
    void consultarEstadoPasskeyLogin(emailNorm).then((estado) => {
      if (cancelado) return;
      setTienePasskey(estado.tieneCredenciales === true);
    });
    return () => {
      cancelado = true;
    };
  }, [emailNorm]);

  async function ejecutarPasskey() {
    if (!emailNorm) {
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
      const estado = await consultarEstadoPasskeyLogin(emailNorm);
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
        body: JSON.stringify({ email: emailNorm })
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
          email: emailNorm,
          response: assertion
        })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.ok || !verifyData.customToken) {
        throw new Error(verifyData.error ?? "Verificación fallida.");
      }

      const cred = await signInWithCustomToken(auth, verifyData.customToken);
      const idToken = await cred.user.getIdToken(true);

      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ idToken, redirect })
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData.ok) {
        throw new Error(sessionData.error ?? "No pudimos crear la sesión.");
      }

      guardarUltimoEmail(emailNorm);
      window.location.href = sessionData.redirectTo ?? redirect ?? "/portal";
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error con passkey";
      if (
        msg.toLowerCase().includes("passkey") ||
        msg.toLowerCase().includes("credential") ||
        msg.toLowerCase().includes("cancel")
      ) {
        if (!msg.toLowerCase().includes("cancel")) {
          setAvisoSinPasskey(true);
        }
      } else {
        onError(msg);
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (!autoIntentar || autoIntentado.current || !emailNorm) return;
    if (tienePasskey !== true) return;
    autoIntentado.current = true;
    void ejecutarPasskey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoIntentar, emailNorm, tienePasskey]);

  const esPrimary = variant === "primary";

  if (!habilitado) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void ejecutarPasskey()}
        disabled={disabled || cargando || !emailNorm}
        className={
          esPrimary
            ? "btn-primary inline-flex w-full items-center justify-center gap-2 py-4 text-base"
            : "btn-ghost inline-flex w-full items-center justify-center gap-2 text-sm"
        }
      >
        {cargando ? (
          <Loader2 size={esPrimary ? 20 : 16} className="animate-spin" />
        ) : (
          <Fingerprint size={esPrimary ? 22 : 16} />
        )}
        {cargando ? "Verificando huella…" : "Entrar con huella o Face ID"}
      </button>

      {tienePasskey === true && !cargando ? (
        <p className="text-center text-xs text-bark-500">
          Acceso rápido para tu cuenta en este dispositivo.
        </p>
      ) : null}

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
          </div>
        
      ) : null}
    </div>
  );
}

