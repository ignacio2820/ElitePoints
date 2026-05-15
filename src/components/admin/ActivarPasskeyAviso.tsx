"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Fingerprint, X } from "lucide-react";
import {
  claveAvisoPasskeyDismiss,
  consultarPasskeySesionActual,
  passkeysHabilitadosEnApp
} from "@/lib/auth/passkeys.client";

interface Props {
  uid: string;
}

export function ActivarPasskeyAviso({ uid }: Props) {
  const [visible, setVisible] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!passkeysHabilitadosEnApp() || !uid) {
      setCargando(false);
      return;
    }
    if (typeof window !== "undefined") {
      if (localStorage.getItem(claveAvisoPasskeyDismiss(uid)) === "1") {
        setCargando(false);
        return;
      }
    }
    void consultarPasskeySesionActual().then((res) => {
      setVisible(res.ok && !res.tieneCredenciales);
      setCargando(false);
    });
  }, [uid]);

  function descartar() {
    localStorage.setItem(claveAvisoPasskeyDismiss(uid), "1");
    setVisible(false);
  }

  if (!passkeysHabilitadosEnApp() || cargando || !visible) {
    return null;
  }

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-terracotta-200 bg-gradient-to-r from-terracotta-50 to-amber-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-terracotta-400 text-white">
            <Fingerprint size={22} />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-bark-800">
              ¡Activá el acceso rápido con huella digital!
            </p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-bark-600">
              Registrá tu huella o passkey una sola vez y la próxima vez entrás al
              panel sin esperar el email del link mágico.
            </p>
            <Link
              href="/admin/configuracion"
              className="btn-primary mt-4 inline-flex items-center gap-2 text-sm"
            >
              <Fingerprint size={16} />
              Configurar huella ahora
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={descartar}
          className="shrink-0 rounded-full p-2 text-bark-400 hover:bg-white/80"
          aria-label="Ocultar aviso"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
