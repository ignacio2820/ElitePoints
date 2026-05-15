"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import {
  consultarPasskeySesionActual,
  passkeysHabilitadosEnApp,
  webAuthnDisponibleEnDispositivo
} from "@/lib/auth/passkeys.client";

interface Props {
  onRegistrada?: () => void;
  className?: string;
}

export function RegistrarPasskeyButton({
  onRegistrada,
  className
}: Props = {}) {
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [yaTiene, setYaTiene] = useState(false);

  useEffect(() => {
    if (!passkeysHabilitadosEnApp()) return;
    void consultarPasskeySesionActual().then((res) => {
      if (res.tieneCredenciales) setYaTiene(true);
    });
  }, []);

  if (!passkeysHabilitadosEnApp()) {
    return null;
  }

  async function registrar() {
    const web = webAuthnDisponibleEnDispositivo();
    if (!web.disponible) {
      setMensaje(web.mensaje ?? "Huella no disponible en este dispositivo.");
      return;
    }

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
      setYaTiene(true);
      setMensaje(
        "Huella registrada y vinculada a tu cuenta. La próxima vez podés ingresar desde el login."
      );
      onRegistrada?.();
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "Error");
    } finally {
      setCargando(false);
    }
  }

  if (yaTiene) {
    return (
      <p className="text-sm text-emerald-700">
        Ya tenés una huella o passkey activa en esta cuenta. Podés registrar otra
        desde otro dispositivo si lo necesitás.
      </p>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void registrar()}
        disabled={cargando}
        className="btn-primary inline-flex items-center gap-2"
      >
        {cargando ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Registrando…
          </>
        ) : (
          <>
            <Fingerprint size={16} />
            Activar huella / passkey
          </>
        )}
      </button>
      {mensaje ? (
        <p
          className={`mt-2 text-sm ${
            mensaje.includes("registrada") || mensaje.includes("vinculada")
              ? "text-emerald-700"
              : "text-rose-700"
          }`}
        >
          {mensaje}
        </p>
      ) : null}
    </div>
  );
}
