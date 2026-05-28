"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import {
  PWA_INSTALL_READY,
  appInstaladaComoPwa,
  esIosSinInstallPrompt,
  obtenerInstallPrompt,
  type DeferredInstallPromptEvent
} from "@/lib/pwa/installPrompt";

const STORAGE_KEY = "mascotpoints:pwa-install-dismiss";

export function InstalarAppBanner() {
  const [deferred, setDeferred] = useState<DeferredInstallPromptEvent | null>(
    null
  );
  const [oculto, setOculto] = useState(true);
  const [instalando, setInstalando] = useState(false);
  const [ios, setIos] = useState(false);

  const sincronizarPrompt = useCallback(() => {
    const existente = obtenerInstallPrompt();
    if (existente) setDeferred(existente);
  }, []);

  useEffect(() => {
    if (appInstaladaComoPwa()) {
      setOculto(true);
      return;
    }
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      setOculto(true);
      return;
    }

    setIos(esIosSinInstallPrompt());
    setOculto(false);
    sincronizarPrompt();

    function onListo() {
      sincronizarPrompt();
    }

    window.addEventListener(PWA_INSTALL_READY, onListo);
    return () => window.removeEventListener(PWA_INSTALL_READY, onListo);
  }, [sincronizarPrompt]);

  function descartar() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOculto(true);
  }

  async function instalar() {
    const prompt = deferred ?? obtenerInstallPrompt();
    if (prompt) {
      setInstalando(true);
      try {
        await prompt.prompt();
        await prompt.userChoice;
      } finally {
        setInstalando(false);
        setOculto(true);
      }
      return;
    }

    // Android/Chrome: reintentar por si el evento llegó justo después del tap.
    const retry = obtenerInstallPrompt();
    if (retry) {
      setDeferred(retry);
      setInstalando(true);
      try {
        await retry.prompt();
        await retry.userChoice;
      } finally {
        setInstalando(false);
        setOculto(true);
      }
    }
  }

  if (oculto || appInstaladaComoPwa()) return null;

  const puedeInstalarDirecto = Boolean(deferred ?? obtenerInstallPrompt());

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-terracotta-200/40 bg-cream-50 p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl shadow-soft ring-1 ring-bark-100">
          <Image
            src="/icons/icon-192.png"
            alt="ElitePoints"
            width={56}
            height={56}
            className="h-full w-full object-cover"
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-bark-700">
            Instalar App de ElitePoints
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-bark-500">
            {ios
              ? "Tocá Compartir en Safari y elegí «Agregar a pantalla de inicio» para ver el logo en tu inicio."
              : puedeInstalarDirecto
                ? "Guardá el acceso en tu pantalla de inicio con el logo de ElitePoints."
                : "Preparando la instalación… Si no aparece el diálogo, recargá la página."}
          </p>

          {ios ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-bark-50 px-3 py-2 text-xs font-medium text-bark-600">
              <Share size={14} className="shrink-0 text-terracotta-500" />
              Compartir → Agregar a pantalla de inicio
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void instalar()}
              disabled={instalando || !puedeInstalarDirecto}
              className="btn-primary mt-3 inline-flex items-center gap-2 text-xs disabled:cursor-wait disabled:opacity-70"
            >
              <Download size={14} />
              {instalando
                ? "Instalando…"
                : puedeInstalarDirecto
                  ? "Instalar ahora"
                  : "Preparando…"}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={descartar}
          className="shrink-0 rounded-full p-1.5 text-bark-400 hover:bg-bark-50"
          aria-label="Ocultar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
