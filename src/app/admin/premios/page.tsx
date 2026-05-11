import { redirect } from "next/navigation";
import { PremiosCatalogo } from "@/components/admin/PremiosCatalogo";
import { getSesion } from "@/lib/auth/server";
import { listarPremiosAdmin } from "@/lib/huellitas/premiosService";
import { getConfiguracion } from "@/lib/huellitas/service";
import { CONFIGURACION_DEFAULT } from "@/lib/huellitas/types";

export const dynamic = "force-dynamic";

export default async function PremiosAdminPage() {
  const sesion = await getSesion();
  if (!sesion || sesion.claims.role !== "admin") {
    redirect("/login?intent=admin&redirect=/admin/premios");
  }

  const { localId } = sesion.claims;
  const [premios, cfg] = await Promise.all([
    listarPremiosAdmin(localId),
    getConfiguracion(localId).catch(() => ({
      ...CONFIGURACION_DEFAULT,
      localId
    }))
  ]);

  return (
    <div className="space-y-6">
      <div>
        <span className="label-elegant">Catálogo</span>
        <h1 className="mt-2 font-display text-4xl font-semibold text-bark-700">
          Premios
        </h1>
        <p className="mt-2 max-w-2xl text-[color:var(--muted)]">
          Gestioná los premios que tus clientes pueden canjear con Huellitas. Las
          imágenes se comprimen antes de subirse para ahorrar espacio.
        </p>
      </div>

      <PremiosCatalogo initialPremios={premios} niveles={cfg.niveles} />
    </div>
  );
}
