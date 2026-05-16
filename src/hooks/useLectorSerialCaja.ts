"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { leerLineasPuertoSerial } from "@/lib/serial/leerLineasPuertoSerial";
import { resolverClienteIdDesdeLector } from "@/lib/serial/resolverClienteDesdeLector";

export function serialApiDisponible(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

interface Opciones {
  onClienteId: (clienteId: string) => void;
  onError?: (mensaje: string) => void;
}

/**
 * Web Serial para lector RS-232 en caja: líneas delimitadas por CR/LF, buffer limpio por escaneo.
 */
export function useLectorSerialCaja({
  onClienteId,
  onError
}: Opciones) {
  const [conectado, setConectado] = useState(false);
  const [conectando, setConectando] = useState(false);
  const portRef = useRef<SerialPort | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const procesandoRef = useRef(false);
  const onClienteIdRef = useRef(onClienteId);
  const onErrorRef = useRef(onError);

  onClienteIdRef.current = onClienteId;
  onErrorRef.current = onError;

  const desconectar = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    portRef.current = null;
    setConectado(false);
  }, []);

  const procesarLinea = useCallback(async (lineaCruda: string) => {
    if (procesandoRef.current) return;
    procesandoRef.current = true;

    try {
      const linea = lineaCruda.trim();
      if (!linea) return;

      const clienteId = await resolverClienteIdDesdeLector(linea);
      if (!clienteId) {
        onErrorRef.current?.(
          "No reconocimos ese código. Probá de nuevo o buscá al cliente manualmente."
        );
        return;
      }

      const r = await fetch(
        `/api/admin/clientes/${encodeURIComponent(clienteId)}`,
        { cache: "no-store", credentials: "same-origin" }
      );
      const data = (await r.json()) as { ok?: boolean };
      if (!r.ok || !data.ok) {
        onErrorRef.current?.("Cliente no encontrado en el local.");
        return;
      }

      onClienteIdRef.current(clienteId);
    } finally {
      procesandoRef.current = false;
    }
  }, []);

  const conectar = useCallback(async () => {
    if (!serialApiDisponible() || !navigator.serial) {
      onErrorRef.current?.(
        "Web Serial no está disponible. Usá Chrome o Edge en HTTPS."
      );
      return;
    }
    if (conectando || conectado) return;

    setConectando(true);
    try {
      const port = await navigator.serial.requestPort();
      portRef.current = port;
      const abort = new AbortController();
      abortRef.current = abort;
      setConectado(true);

      await leerLineasPuertoSerial(
        port,
        (linea) => procesarLinea(linea),
        { signal: abort.signal }
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotFoundError") {
        return;
      }
      const msg =
        err instanceof Error ? err.message : "No se pudo conectar el lector.";
      onErrorRef.current?.(msg);
    } finally {
      setConectando(false);
      setConectado(false);
      portRef.current = null;
      abortRef.current = null;
    }
  }, [conectado, conectando, procesarLinea]);

  useEffect(() => {
    return () => {
      void desconectar();
    };
  }, [desconectar]);

  return {
    disponible: serialApiDisponible(),
    conectado,
    conectando,
    conectar,
    desconectar
  };
}
