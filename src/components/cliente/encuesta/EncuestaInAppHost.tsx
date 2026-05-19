"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { EncuestaPostCompraPopup } from "@/components/cliente/encuesta/EncuestaPostCompraPopup";
import type { EncuestaPendienteInApp } from "@/lib/huellitas/encuestasInAppService";

const INTERVALO_MS = 45_000;

/**
 * Detecta encuestas post-compra pendientes y muestra el pop-up en el portal cliente.
 */
export function EncuestaInAppHost() {
  const pathname = usePathname();
  const [encuesta, setEncuesta] = useState<EncuestaPendienteInApp | null>(null);
  const descartadaRef = useRef<string | null>(null);
  const buscando = useRef(false);

  const buscarPendiente = useCallback(async () => {
    if (buscando.current) return;
    buscando.current = true;
    try {
      const res = await fetch("/api/cliente/encuesta/pendiente", {
        cache: "no-store",
        credentials: "same-origin"
      });
      const data = (await res.json()) as {
        ok?: boolean;
        encuesta?: EncuestaPendienteInApp;
      };
      if (data.ok && data.encuesta) {
        if (data.encuesta.token === descartadaRef.current) {
          setEncuesta(null);
        } else {
          setEncuesta(data.encuesta);
        }
      } else {
        setEncuesta(null);
      }
    } catch {
      /* silencioso: reintenta en el próximo ciclo */
    } finally {
      buscando.current = false;
    }
  }, []);

  useEffect(() => {
    void buscarPendiente();
    const id = window.setInterval(() => void buscarPendiente(), INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [buscarPendiente, pathname]);

  useEffect(() => {
    const onFocus = () => void buscarPendiente();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [buscarPendiente]);

  if (!encuesta) return null;

  return (
    <EncuestaPostCompraPopup
      encuesta={encuesta}
      onCerrar={() => {
        descartadaRef.current = encuesta.token;
        setEncuesta(null);
      }}
      onEnviada={() => {
        descartadaRef.current = encuesta.token;
        setEncuesta(null);
      }}
    />
  );
}
