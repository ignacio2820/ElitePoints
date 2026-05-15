"use client";

import { useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { auth } from "@/lib/firebase/client";
import { signInWithCustomToken } from "firebase/auth";

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

  if (process.env.NEXT_PUBLIC_WEBAUTHN_ENABLED !== "true") {
    return null;
  }

  async function onClick() {
    if (!email.trim()) {
      onError("Ingresá tu email primero.");
      return;
    }
    setCargando(true);
    try {
      const optRes = await fetch("/api/auth/passkey/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const optData = await optRes.json();
      if (!optRes.ok || !optData.ok) {
        throw new Error(optData.error ?? "No hay passkey para este email.");
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
      onError(err instanceof Error ? err.message : "Error con passkey");
    } finally {
      setCargando(false);
    }
  }

  return (
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
  );
}
