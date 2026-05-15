"use client";

import { useEffect } from "react";

/** Registra el service worker de la PWA (solo en el cliente). */
export function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        /* ignorar en dev o si SW no está disponible */
      });
  }, []);

  return null;
}
