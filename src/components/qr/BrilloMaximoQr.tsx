"use client";

import { useEffect } from "react";

interface Props {
  /** Si el QR está visible (modal o pantalla dedicada). */
  activo: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Mitiga reflejos del vidrio: fondo blanco puro y Wake Lock cuando el navegador lo permite (PWA).
 */
export function BrilloMaximoQr({ activo, children, className = "" }: Props) {
  useEffect(() => {
    if (!activo || typeof document === "undefined") return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    const prevTheme = html.getAttribute("data-qr-lector");

    html.style.backgroundColor = "#FFFFFF";
    body.style.backgroundColor = "#FFFFFF";
    html.setAttribute("data-qr-lector", "1");

    let wake: WakeLockSentinel | undefined;
    const pedirWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wake = await navigator.wakeLock.request("screen");
        }
      } catch {
        // ignore: Safari / permisos
      }
    };
    void pedirWakeLock();

    const onVisible = () => {
      if (document.visibilityState === "visible") void pedirWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void wake?.release();
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
      if (prevTheme === null) html.removeAttribute("data-qr-lector");
      else html.setAttribute("data-qr-lector", prevTheme);
    };
  }, [activo]);

  return (
    <div
      className={`bg-[#FFFFFF] ${className}`}
      style={{ colorScheme: "light" }}
    >
      {children}
    </div>
  );
}
