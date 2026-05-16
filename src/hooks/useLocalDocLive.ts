"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase/client";

export interface LocalDocLive {
  nombre: string;
  logoUrl: string;
  cargando: boolean;
}

export const LOGO_PLACEHOLDER = "/icons/icon.svg";

function parseLocalDoc(
  localId: string,
  data: Record<string, unknown> | undefined
): Pick<LocalDocLive, "nombre" | "logoUrl"> {
  const nombre =
    typeof data?.nombre === "string" && data.nombre.trim()
      ? data.nombre.trim()
      : localId;
  const logoUrl =
    typeof data?.logoUrl === "string" && data.logoUrl.trim()
      ? data.logoUrl.trim()
      : "";
  return { nombre, logoUrl };
}

async function fetchLocalDesdeApi(): Promise<{
  nombre?: string;
  logoUrl?: string;
} | null> {
  try {
    const r = await fetch("/api/admin/local/info", {
      credentials: "same-origin",
      cache: "no-store"
    });
    const data = (await r.json()) as {
      ok?: boolean;
      info?: { nombre?: string; logoUrl?: string };
    };
    if (!r.ok || !data.ok || !data.info) return null;
    return data.info;
  } catch {
    return null;
  }
}

/**
 * Escucha `Locales/{localId}` en tiempo real (onSnapshot) y refuerza con
 * GET /api/admin/local/info (cookie de sesión) para F5 y cuando Firestore
 * client no tiene Auth activo.
 */
export function useLocalDocLive(
  localId: string,
  inicial?: { nombre?: string; logoUrl?: string | null }
): LocalDocLive {
  const inicialRef = useRef(inicial);
  inicialRef.current = inicial;

  const [estado, setEstado] = useState<LocalDocLive>(() => {
    const seed = parseLocalDoc(localId, {
      nombre: inicial?.nombre,
      logoUrl: inicial?.logoUrl ?? undefined
    });
    return { ...seed, cargando: true };
  });

  const aplicar = useCallback(
    (data: Record<string, unknown> | undefined) => {
      const parsed = parseLocalDoc(localId, data);
      setEstado({
        nombre: parsed.nombre,
        logoUrl: parsed.logoUrl,
        cargando: false
      });
    },
    [localId]
  );

  useEffect(() => {
    if (!localId) return;

    const seed = parseLocalDoc(localId, {
      nombre: inicialRef.current?.nombre,
      logoUrl: inicialRef.current?.logoUrl ?? undefined
    });
    setEstado({ ...seed, cargando: true });

    let activo = true;

    const cargarApi = async () => {
      const info = await fetchLocalDesdeApi();
      if (!activo || !info) return;
      aplicar({
        nombre: info.nombre,
        logoUrl: info.logoUrl
      });
    };

    void cargarApi();

    let unsubSnapshot: (() => void) | undefined;

    if (isFirebaseConfigured()) {
      const ref = doc(db, "Locales", localId);
      unsubSnapshot = onSnapshot(
        ref,
        (snap) => {
          if (!activo) return;
          aplicar(
            snap.exists() ? (snap.data() as Record<string, unknown>) : undefined
          );
        },
        () => {
          void cargarApi();
        }
      );
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void cargarApi();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      activo = false;
      unsubSnapshot?.();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [localId, aplicar]);

  return estado;
}
