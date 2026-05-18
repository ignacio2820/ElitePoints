/** Evento nativo de instalación PWA (Chrome, Edge, Samsung Internet). */
export interface DeferredInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWA_INSTALL_READY = "mascotpoints:pwa-install-ready";

declare global {
  interface Window {
    __mascotDeferredInstall?: DeferredInstallPromptEvent;
  }
}

let capturaRegistrada = false;

/** Registra el listener lo antes posible (importar desde el layout cliente). */
export function registrarCapturaInstallPrompt(): void {
  if (typeof window === "undefined" || capturaRegistrada) return;
  capturaRegistrada = true;

  window.addEventListener(
    "beforeinstallprompt",
    (e) => {
      e.preventDefault();
      window.__mascotDeferredInstall = e as DeferredInstallPromptEvent;
      window.dispatchEvent(new CustomEvent(PWA_INSTALL_READY));
    },
    { capture: true }
  );
}

export function obtenerInstallPrompt(): DeferredInstallPromptEvent | null {
  if (typeof window === "undefined") return null;
  return window.__mascotDeferredInstall ?? null;
}

export function appInstaladaComoPwa(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function esIosSinInstallPrompt(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) && !("onbeforeinstallprompt" in window);
}
