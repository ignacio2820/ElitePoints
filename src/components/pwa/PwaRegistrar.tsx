"use client";

import { useEffect } from "react";
import { registrarCapturaInstallPrompt } from "@/lib/pwa/installPrompt";

// Captura beforeinstallprompt antes del primer render del banner (evita perder el evento).
registrarCapturaInstallPrompt();

/** Registra el service worker de la PWA (solo en el cliente). */
export function PwaRegistrar() {
  useEffect(() => {
    registrarCapturaInstallPrompt();

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        /* ignorar en dev o si SW no está disponible */
      });
  }, []);

  return null;
}
