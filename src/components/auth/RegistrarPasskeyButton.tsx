"use client";

import { useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";

export function RegistrarPasskeyButton() {
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  if (process.env.NEXT_PUBLIC_WEBAUTHN_ENABLED !== "true") {
    return null;
  }

  async function registrar() {
    setCargando(true);
    setMensaje(null);
    try {
      const optRes = await fetch("/api/auth/passkey/register/options", {
        method: "POST"
      });
      const optData = await optRes.json();
      if (!optRes.ok || !optData.ok) {
        throw new Error(optData.error ?? "No pudimos iniciar el registro.");
      }

      const attestation = await startRegistration({
        optionsJSON: optData.options
      });

      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: attestation })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.ok) {
        throw new Error(verifyData.error ?? "Registro fallido.");
      }
      setMensaje("Passkey registrada. La próxima vez podés ingresar con huella.");
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "Error");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => void registrar()}
        disabled={cargando}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-bark-600 hover:text-terracotta-500"
      >
        {cargando ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Fingerprint size={12} />
        )}
        Activar huella / passkey
      </button>
      {mensaje ? (
        <p className="mt-1 text-[11px] text-bark-500">{mensaje}</p>
      ) : null}
    </div>
  );
}
