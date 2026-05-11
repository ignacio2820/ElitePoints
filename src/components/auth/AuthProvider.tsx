"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { onUserChanged, logout } from "@/lib/auth/client";
import type { SesionInfo } from "@/lib/auth/types";

interface AuthContextValue {
  sesion: SesionInfo | null;
  cargando: boolean;
  refrescar: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  sesion: null,
  cargando: true,
  refrescar: async () => {},
  cerrarSesion: async () => {}
});

export function AuthProvider({
  children,
  sesionInicial
}: {
  children: React.ReactNode;
  sesionInicial?: SesionInfo | null;
}) {
  const [sesion, setSesion] = useState<SesionInfo | null>(sesionInicial ?? null);
  const [cargando, setCargando] = useState<boolean>(sesionInicial === undefined);

  async function refrescar() {
    setCargando(true);
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await r.json()) as { ok: boolean; sesion: SesionInfo | null };
      setSesion(data.sesion ?? null);
    } catch {
      setSesion(null);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    const off = onUserChanged(() => {
      refrescar().catch(() => {});
    });
    if (sesionInicial === undefined) {
      refrescar().catch(() => {});
    }
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      sesion,
      cargando,
      refrescar,
      cerrarSesion: logout
    }),
    [sesion, cargando]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
