import { requireAdmin } from "@/lib/auth/server";
import { listarClientes } from "@/lib/huellitas/clientesService";
import { getConfiguracion } from "@/lib/huellitas/service";
import { BuscadorClientes } from "@/components/admin/BuscadorClientes";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const sesion = await requireAdmin();
  const localId = sesion.claims.localId;

  const [clientesIniciales, cfg] = await Promise.all([
    listarClientes(localId, "", 100),
    getConfiguracion(localId)
  ]);

  return (
    <div>
      <div className="mb-8">
        <span className="label-elegant">Cartera</span>
        <h1 className="mt-2 font-display text-4xl font-semibold text-bark-700">
          Clientes y mascotas
        </h1>
        <p className="mt-2 max-w-xl text-[color:var(--muted)]">
          Buscá por nombre, email o teléfono. Sumá Huellitas manualmente cuando
          el cliente no tenga el celular a mano.
        </p>
      </div>

      <BuscadorClientes
        clientesIniciales={clientesIniciales}
        niveles={cfg.niveles}
        valorMonetarioHuellita={cfg.valorMonetarioHuellita}
        montoParaUnaHuellita={cfg.montoParaUnaHuellita}
      />
    </div>
  );
}
