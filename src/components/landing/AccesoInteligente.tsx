"use client";

import Link from "next/link";
import { ArrowRight, LogIn, PawPrint, Sparkles, UserPlus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { WebEliteShell } from "@/components/landing/WebEliteShell";
import { LocalBrandMark } from "@/components/LocalBrandMark";
import { RUTA_DASHBOARD, RUTA_PORTAL } from "@/lib/auth/redirect";

interface Props {
  localId: string;
  nombreLocal: string;
  logoUrl?: string | null;
  codigoRef?: string;
}

export function AccesoInteligente({
  localId,
  nombreLocal,
  logoUrl,
  codigoRef
}: Props) {
  const { sesion, cargando } = useAuth();

  const qsRegistro = new URLSearchParams({ localId });
  if (codigoRef) qsRegistro.set("ref", codigoRef);
  const qsLogin = new URLSearchParams({ localId });
  qsLogin.set("redirect", RUTA_PORTAL);

  return (
    <WebEliteShell tagline="Acceso inteligente">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D4A04C]/30 bg-[#D4A04C]/10">
          <LocalBrandMark
            nombreLocal={nombreLocal}
            logoUrl={logoUrl}
            size={40}
            className="rounded-xl"
          />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D4A04C]">
          Programa de fidelidad
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">
          {nombreLocal}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Sumá huellitas en cada compra y canjealas por premios exclusivos.
        </p>
      </div>

      <div className="mt-10 space-y-4">
        {cargando ? (
          <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
        ) : sesion?.claims.role === "cliente" ? (
          <Link href={RUTA_PORTAL} className="webelite-btn-primary flex w-full items-center justify-center gap-2">
            <PawPrint size={20} />
            Ver mis Huellitas
            <ArrowRight size={18} />
          </Link>
        ) : sesion?.claims.role === "admin" ? (
          <Link
            href={RUTA_DASHBOARD}
            className="webelite-btn-primary flex w-full items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            Ir al panel del local
            <ArrowRight size={18} />
          </Link>
        ) : (
          <>
            <Link
              href={`/registro?${qsRegistro.toString()}`}
              className="webelite-btn-primary flex w-full items-center justify-center gap-2"
            >
              <UserPlus size={20} />
              Registrarme por primera vez
            </Link>
            <Link
              href={`/login?${qsLogin.toString()}`}
              className="webelite-btn-secondary flex w-full items-center justify-center gap-2"
            >
              <LogIn size={18} />
              Ya tengo cuenta / Ingresar
            </Link>
          </>
        )}
      </div>

      {codigoRef ? (
        <p className="mt-6 text-center text-xs text-zinc-500">
          Código de invitación:{" "}
          <span className="font-mono text-[#D4A04C]">{codigoRef}</span>
        </p>
      ) : null}
    </WebEliteShell>
  );
}
