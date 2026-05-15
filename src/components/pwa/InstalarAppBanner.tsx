"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "mascotpoints:pwa-install-dismiss";

export function InstalarAppBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [oculto, setOculto] = useState(true);
  const [instalando, setInstalando] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "1") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setOculto(false);
    }

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  function descartar() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOculto(true);
  }

  async function instalar() {
    if (!deferred) {
      alert(
        "Para instalar: en Chrome/Edge usá el menú ⋮ → «Instalar app». " +
          "En iPhone: Compartir → «Agregar a pantalla de inicio»."
      );
      return;
    }
    setInstalando(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      setInstalando(false);
      setOculto(true);
    }
  }

  if (oculto) return null;

  const Wrapper = "div" as const;

  return (
    <Wrapper className="mb-6 overflow-hidden rounded-2xl border border-[#D4A04C]/25 bg-gradient-to-r from-[#1a1a1c] to-[#121214] p-4 shadow-lg">
      <Wrapper className="flex items-start gap-3">
        <Wrapper className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4A04C]/15 text-[#D4A04C]">
          <Download size={18} />
        </Wrapper>
        <Wrapper className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Instalar App de MascotPoints
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
            Accedé a tus huellitas desde el ícono en la pantalla de inicio, sin
            abrir el navegador cada vez.
          </p>
          <button
            type="button"
            onClick={() => void instalar()}
            disabled={instalando}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#D4A04C] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#0a0a0b] transition hover:bg-[#e8b85a] disabled:opacity-60"
          >
            <Download size={14} />
            {instalando ? "Instalando…" : "Instalar ahora"}
          </button>
        </Wrapper>
        <button
          type="button"
          onClick={descartar}
          className="shrink-0 rounded-full p-1.5 text-zinc-500 hover:bg-white/5"
          aria-label="Ocultar"
        >
          <X size={16} />
        </button>
      </Wrapper>
    </Wrapper>
  );
}
