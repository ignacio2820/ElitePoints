import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MascotPointsFooter } from "@/components/MascotPointsFooter";
import { AdminNav } from "@/components/admin/AdminNav";
import { LocalBrandMark } from "@/components/LocalBrandMark";
import { UserMenu } from "@/components/auth/UserMenu";
import { getSesion } from "@/lib/auth/server";
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
    redirect("/login?intent=admin&redirect=/admin");
  }
  if (sesion.claims.role !== "admin") {
    redirect("/mi-cuenta");
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
  const perfilCompleto = tieneNombre && tieneLogo;
  const nombreVisible = tieneNombre ? info.nombre : "Mi Pet Shop";

  return (
    <div className="flex min-h-screen flex-col bg-cream-50 text-bark-700">
      <header className="sticky top-0 z-10 border-b border-bark-800 bg-bark-700 text-white shadow-soft print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/admin"
            className="flex min-w-0 items-center gap-3 rounded-2xl px-1.5 py-1 transition hover:bg-white/5"
          >
            {tieneLogo ? (
              <LocalBrandMark
                nombreLocal={info.nombre}
                logoUrl={info.logoUrl}
                size={40}
                imageClassName="border-white/20 bg-white shadow-soft"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-terracotta-300">
                <LocalBrandMark
                  nombreLocal={nombreVisible}
                  logoUrl={null}
                  size={22}
                  iconClassName="text-terracotta-300"
                />
              </div>
            )}
            <div className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Admin
              </span>
              <span className="block truncate font-display text-lg font-bold text-white">
                {nombreVisible}
              </span>
            </div>
          </Link>
          <AdminNav className="hidden md:flex" />
          <div className="flex items-center gap-3">
            {!perfilCompleto ? (
              <Link
                href="/admin/configuracion"
                className="hidden items-center gap-1.5 rounded-full bg-terracotta-400 px-4 py-2 text-xs font-bold uppercase tracking-[0.06em] text-white shadow-soft transition hover:bg-terracotta-500 sm:inline-flex"
              >
                Configurar perfil
              </Link>
            ) : null}
            <UserMenu tone="forest" />
          </div>
        </div>
        <AdminNav className="overflow-x-auto px-4 pb-2 md:hidden" />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 print:max-w-none print:p-0">
        {mostrarAvisoMembresia ? (
          <AvisoMembresiaPorVencer
            diasRestantes={diasRestantes}
            fechaVencimiento={fechaVencimiento}
          />
        ) : null}
        {!perfilCompleto ? (
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-terracotta-200 bg-terracotta-50 px-5 py-4 text-bark-700 shadow-soft">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-terracotta-500">
                Completá la identidad del local
              </p>
              <p className="mt-1 max-w-xl text-sm text-bark-600">
                {tieneNombre
                  ? "Subí el logo para que tus clientes vean tu marca en QRs, emails y el panel cliente."
                  : "Cargá el nombre comercial y el logo para personalizar todo el programa de fidelidad."}
              </p>
            </div>
            <Link
              href="/admin/configuracion"
              className="btn-primary inline-flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm"
            >
              Configurar perfil
            </Link>
          </div>
        ) : null}
        {children}
      </main>
      <MascotPointsFooter className="print:hidden" />
    </div>
  );
}
