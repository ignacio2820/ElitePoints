"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAuth } from "@/components/auth/AuthProvider";
import { LOGO_PLACEHOLDER, useLocalDocLive } from "@/hooks/useLocalDocLive";

interface AdminHeaderProps {
  localId: string;
  nombreInicial: string;
  logoUrlInicial?: string | null;
}

export function AdminHeader({
  localId,
  nombreInicial,
  logoUrlInicial
}: AdminHeaderProps) {
  const { sesion, cerrarSesion } = useAuth();
  const { nombre, logoUrl } = useLocalDocLive(localId, {
    nombre: nombreInicial,
    logoUrl: logoUrlInicial
  });

  const nombreVisible =
    nombre.trim().length > 0 && nombre !== localId ? nombre : nombreInicial;
  const srcLogo =
    logoUrl.trim() ||
    (typeof logoUrlInicial === "string" ? logoUrlInicial.trim() : "") ||
    LOGO_PLACEHOLDER;
  const email = sesion?.email ?? "";

  return (
    <header className="sticky top-0 z-50 w-full shadow-soft print:hidden">
      {/* Renglón 1: identidad del local + sesión */}
      <div className="flex w-full items-center justify-between bg-emerald-900 px-6 py-3 text-white">
        <Link
          href="/admin"
          className="flex min-w-0 max-w-[min(100%,20rem)] items-center gap-3 transition hover:opacity-90 sm:max-w-md"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={srcLogo}
            src={srcLogo}
            alt={`Logo de ${nombreVisible}`}
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full border-2 border-orange-500 object-cover bg-white"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.endsWith(LOGO_PLACEHOLDER)) {
                img.src = LOGO_PLACEHOLDER;
              }
            }}
          />
          <span className="truncate font-display text-base font-bold leading-tight sm:text-lg">
            {nombreVisible}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {email ? (
            <span
              className="max-w-[7rem] truncate text-[11px] text-white/90 sm:max-w-[12rem] sm:text-xs md:max-w-[14rem]"
              title={email}
            >
              {email}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void cerrarSesion()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-rose-600/40 sm:px-3 sm:text-[11px]"
          >
            <LogOut size={14} className="shrink-0" aria-hidden />
            CERRAR SESIÓN
          </button>
        </div>
      </div>

      {/* Renglón 2: navegación operativa */}
      <div className="scrollbar-none flex w-full items-center gap-4 overflow-x-auto whitespace-nowrap bg-emerald-800 px-6 py-2">
        <AdminNav />
      </div>
    </header>
  );
}
