import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MascotPointsFooter } from "@/components/MascotPointsFooter";
import { AdminNav } from "@/components/admin/AdminNav";
import { LocalBrandMark } from "@/components/LocalBrandMark";
import { UserMenu } from "@/components/auth/UserMenu";
import { getSesion } from "@/lib/auth/server";
import { RUTA_PORTAL } from "@/lib/auth/redirect";
import { AvisoMembresiaPorVencer } from "@/components/admin/AvisoMembresiaPorVencer";
import { getInfoLocal } from "@/lib/huellitas/localService";
import {
  diasHastaVencimiento,
  membresiaPorVencer
} from "@/lib/huellitas/membresia";
import { notificarMembresiaPorVencerSiCorresponde } from "@/lib/huellitas/membresiaAlertasService";
import {
  requireMembresiaActiva,
  rutaRequiereAccesoOperativo
} from "@/lib/huellitas/requireMembresiaActiva";

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const sesion = await getSesion();
  if (!sesion) {
    redirect("/login?intent=admin&redirect=/dashboard");
  }
  if (sesion.claims.role !== "admin") {
    redirect(RUTA_PORTAL);
  }

  const pathname = headers().get("x-pathname") ?? "";
  if (rutaRequiereAccesoOperativo(pathname)) {
    await requireMembresiaActiva(sesion.claims.localId);
  }

  const info = await getInfoLocal(sesion.claims.localId);
  void notificarMembresiaPorVencerSiCorresponde(info);

  const diasRestantes = diasHastaVencimiento(info);
  const mostrarAvisoMembresia =
    membresiaPorVencer(info) && diasRestantes !== null && diasRestantes > 0;
  const fechaVencimiento = info.fechaVencimiento
    ? info.fechaVencimiento.toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      })
    : "";

  const tieneNombre =
    info.nombre.trim().length > 0 && info.nombre !== sesion.claims.localId;
  const tieneLogo = !!info.logoUrl?.trim();
  const nombreVisible = tieneNombre ? info.nombre : "Mi Pet Shop";

  return (
    <div className="flex min-h-screen flex-col bg-cream-50 text-bark-700">
      <header className="sticky top-0 z-50 bg-bark-700 text-white shadow-soft print:hidden">
        <div className="mx-auto flex w-full max-w-6xl flex-col px-6">
          {/* Fila 1: logo + nombre (izq.) · cerrar sesión (der.) — nunca comparte línea con la nav */}
          <div className="flex w-full min-w-0 flex-col gap-3 border-b border-white/15 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Link
              href="/admin"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-1 pl-0.5 pr-2 transition hover:bg-white/5 sm:max-w-[min(100%,32rem)]"
            >
              {tieneLogo ? (
                <span className="shrink-0">
                  <LocalBrandMark
                    nombreLocal={info.nombre}
                    logoUrl={info.logoUrl}
                    shape="circle"
                    size={44}
                    imageClassName="border-white/20 bg-white shadow-soft"
                  />
                </span>
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-terracotta-300">
                  <LocalBrandMark
                    nombreLocal={nombreVisible}
                    logoUrl={null}
                    size={24}
                    iconClassName="text-terracotta-300"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  Admin
                </span>
                <span className="block truncate font-display text-base font-bold leading-tight text-white sm:text-lg">
                  {nombreVisible}
                </span>
              </div>
            </Link>

            <div className="flex shrink-0 items-center justify-end sm:justify-start sm:pl-2">
              <UserMenu tone="forest" showSignOutLabel />
            </div>
          </div>

          {/* Fila 2: solapas del panel — scroll si no entran; nunca detrás del menú usuario */}
          <div className="border-b border-bark-950/40 border-t border-white/10 bg-bark-900/30 px-1 py-2.5 sm:px-0">
            <div className="flex w-full min-w-0 justify-start overflow-x-auto overflow-y-visible [scrollbar-width:thin] sm:gap-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25">
              <AdminNav />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 print:max-w-none print:p-0">
        {mostrarAvisoMembresia ? (
          <AvisoMembresiaPorVencer
            diasRestantes={diasRestantes}
            fechaVencimiento={fechaVencimiento}
          />
        ) : null}
        {children}
      </main>
      <MascotPointsFooter className="print:hidden" />
    </div>
  );
}
