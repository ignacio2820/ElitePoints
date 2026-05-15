"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "mascotpoints:pwa-install-dismiss";

function appYaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function InstalarAppBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [oculto, setOculto] = useState(true);
  const [instalando, setInstalando] = useState(false);

  useEffect(() => {
    if (appYaInstalada()) {
      setOculto(true);
      return;
    }
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      setOculto(true);
      return;
    }

    setOculto(false);

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  function descartar() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOculto(true);
  }

  async function instalar() {
    if (deferred) {
      setInstalando(true);
      try {
        await deferred.prompt();
        await deferred.userChoice;
      } finally {
        setInstalando(false);
        setOculto(true);
      }
      return;
    }
    alert(
      "Para instalar: en Chrome/Edge usá el menú ⋮ → «Instalar app». " +
        "En iPhone: tocá Compartir → «Agregar a pantalla de inicio»."
    );
  }

  if (oculto || appYaInstalada()) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-terracotta-200/40 bg-cream-50 p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terracotta-100 text-terracotta-500">
          <Download size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-bark-700">
            Instalar App de MascotPoints
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-bark-500">
            Guardá el acceso en tu pantalla de inicio para ver tus huellitas más
            rápido la próxima vez.
          </p>
          <button
            type="button"
            onClick={() => void instalar()}
            disabled={instalando}
            className="btn-primary mt-3 inline-flex items-center gap-2 text-xs"
          >
            <Download size={14} />
            {instalando ? "Instalando…" : "Instalar ahora"}
          </button>
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
