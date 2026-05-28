import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ElitePointsFooter } from "@/components/ElitePointsFooter";
import { AdminHeader } from "@/components/admin/AdminHeader";
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
  const nombreVisible = tieneNombre ? info.nombre : "Mi Pet Shop";

  return (
    <div className="flex min-h-screen flex-col bg-cream-50 text-bark-700">
      <AdminHeader
        localId={sesion.claims.localId}
        nombreInicial={nombreVisible}
        logoUrlInicial={info.logoUrl}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 print:max-w-none print:p-0">
        {mostrarAvisoMembresia ? (
          <AvisoMembresiaPorVencer
            diasRestantes={diasRestantes}
            fechaVencimiento={fechaVencimiento}
          />
        ) : null}
        {children}
      </main>
      <ElitePointsFooter className="print:hidden" />
    </div>
  );
}
