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

  return (
    <div className="paw-bg flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-bark-800 bg-bark-900 text-cream-50 shadow-soft print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <LocalBrandMark
              nombreLocal={info.nombre}
              logoUrl={info.logoUrl}
              size={36}
            />
            <div className="min-w-0">
              <span className="block truncate font-display text-lg font-semibold text-white">
                Admin · {info.nombre}
              </span>
            </div>
          </Link>
          <AdminNav className="hidden md:flex" />
          <UserMenu tone="forest" />
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
        {children}
      </main>
      <MascotPointsFooter className="print:hidden" />
    </div>
  );
}
