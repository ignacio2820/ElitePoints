"use client";

import Link from "next/link";
import { ArrowRight, LogIn, PawPrint, UserPlus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LocalBrandMark } from "@/components/LocalBrandMark";
import { ElitePointsLogo } from "@/components/ElitePointsLogo";
import { RUTA_PORTAL } from "@/lib/auth/redirect";

interface Props {
  localId: string;
  nombreLocal: string;
  logoUrl?: string | null;
  codigoRef?: string;
}

/**
 * Landing del QR del comercio: solo flujo cliente (registro o ingreso).
 * Nunca redirige automáticamente a dueños al dashboard.
 */
export function AccesoClienteLanding({
  localId,
  nombreLocal,
  logoUrl,
  codigoRef
}: Props) {
  const { sesion, cargando } = useAuth();

  const qsRegistro = new URLSearchParams({ localId });
  if (codigoRef) qsRegistro.set("ref", codigoRef);

  const qsLogin = new URLSearchParams({ localId, redirect: RUTA_PORTAL });

  return (
    <main className="paw-bg min-h-screen">
      <header className="sticky top-0 z-10 border-b border-bark-100/20 bg-bark-600/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <LocalBrandMark
              nombreLocal={nombreLocal}
              logoUrl={logoUrl}
              size={36}
            />
            <span className="truncate font-display text-lg font-semibold text-white">
              {nombreLocal}
            </span>
          </div>
          <ElitePointsLogo variant="icon" size={32} />
        </div>
      </header>

      <section className="mx-auto max-w-lg px-6 py-10">
        <div className="text-center">
          <span className="label-elegant text-terracotta-300">Programa Puntos</span>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            Accedé a tus puntos
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-bark-100">
            Sumá puntos en cada compra en{" "}
            <strong className="text-white">{nombreLocal}</strong> y canjealos por
            premios.
          </p>
        </div>

        <div className="surface-card mt-8 rounded-3xl p-6 sm:p-8">
          {cargando ? (
            <div className="h-28 animate-pulse rounded-2xl bg-cream-100" />
          ) : sesion?.claims.role === "cliente" ? (
            <div className="text-center">
              <p className="text-sm text-bark-600">
                Ya tenés sesión iniciada. Entrá a tu panel para ver saldo y
                premios.
              </p>
              <Link
                href={RUTA_PORTAL}
                className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2"
              >
                <PawPrint size={18} />
                Ver mis Puntos
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : sesion?.claims.role === "admin" ? (
            <div className="text-center text-sm text-bark-600">
              <p>
                Detectamos una sesión de dueño de local. Este QR es para clientes
                del programa de fidelidad.
              </p>
              <p className="mt-3 text-bark-500">
                Para administrar tu Pet Shop, ingresá desde el login de dueños.
              </p>
              <Link href="/login" className="btn-ghost mt-4 inline-flex text-sm">
                Ir al login de dueños
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <Link
                href={`/registro?${qsRegistro.toString()}`}
                className="btn-primary flex w-full items-center justify-center gap-2 py-4"
              >
                <UserPlus size={20} />
                Soy nuevo, quiero registrarme
              </Link>
              <Link
                href={`/login?${qsLogin.toString()}`}
                className="btn-ghost flex w-full items-center justify-center gap-2 py-4 text-bark-700"
              >
                <LogIn size={18} />
                Ya tengo cuenta, quiero ingresar
              </Link>
            </div>
          )}
        </div>

        {codigoRef ? (
          <p className="mt-4 text-center text-xs text-bark-200">
            Código de invitación:{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-terracotta-300">
              {codigoRef}
            </code>
          </p>
        ) : null}
      </section>
    </main>
  );
}
