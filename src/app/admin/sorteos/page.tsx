import { redirect } from "next/navigation";
import { SorteosAdminPanel } from "@/components/admin/SorteosAdminPanel";
import { getSesion } from "@/lib/auth/server";
import { getConfiguracion } from "@/lib/huellitas/service";
import { listarSorteosAdmin } from "@/lib/huellitas/sorteosService";
import { CONFIGURACION_DEFAULT } from "@/lib/huellitas/types";

export const dynamic = "force-dynamic";

export default async function AdminSorteosPage() {
  const sesion = await getSesion();
  if (!sesion || sesion.claims.role !== "admin") {
    redirect("/login?intent=admin&redirect=/admin/sorteos");
  }

  const { localId } = sesion.claims;
  const [cfg, sorteos] = await Promise.all([
    getConfiguracion(localId).catch(() => ({
      ...CONFIGURACION_DEFAULT,
      localId
    })),
    listarSorteosAdmin(localId)
  ]);

  return (
    <div className="space-y-6">
      <div>
        <span className="label-elegant">Promociones</span>
        <h1 className="mt-2 font-display text-4xl font-semibold text-bark-700">
          Sorteos
        </h1>
        <p className="mt-2 max-w-2xl text-[color:var(--muted)]">
          Creá sorteos automáticos por nivel de lealtad. Los clientes pueden
          potenciar sus chances gastando huellitas de su saldo actual.
        </p>
      </div>

      <SorteosAdminPanel niveles={cfg.niveles} sorteosIniciales={sorteos} />
    </div>
  );
}
