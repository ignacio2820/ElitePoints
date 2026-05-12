import { requireAdmin } from "@/lib/auth/server";
import { listarClientes } from "@/lib/huellitas/clientesService";
import { getConfiguracion } from "@/lib/huellitas/service";
import { CONFIGURACION_DEFAULT } from "@/lib/huellitas/types";
import { BuscadorClientes } from "@/components/admin/BuscadorClientes";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const sesion = await requireAdmin();
  const localId = sesion.claims.localId;

  let clientesIniciales: Awaited<ReturnType<typeof listarClientes>> = [];
  let avisoCarga: string | null = null;
  try {
    clientesIniciales = await listarClientes(localId, "", 100);
  } catch (err) {
    avisoCarga =
      err instanceof Error
        ? err.message
        : "No pudimos cargar la cartera de clientes.";
  }

  let cfg = { ...CONFIGURACION_DEFAULT, localId };
  try {
    cfg = await getConfiguracion(localId);
  } catch {
    // Mantenemos defaults para que el panel se renderice aunque falle la config.
  }

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

      {avisoCarga ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No pudimos sincronizar la lista inicial. Podés buscar igual; si el
          problema persiste, revisá la conexión con Firestore.
          <span className="mt-1 block text-xs text-amber-800/80">{avisoCarga}</span>
        </div>
      ) : null}

      <BuscadorClientes
        clientesIniciales={clientesIniciales}
        niveles={cfg.niveles}
        valorMonetarioHuellita={cfg.valorMonetarioHuellita}
        montoParaUnaHuellita={cfg.montoParaUnaHuellita}
      />
    </div>
  );
}
