import { requireAdmin } from "@/lib/auth/server";
import { listarClientes } from "@/lib/huellitas/clientesService";
import { listarPremiosAdmin } from "@/lib/huellitas/premiosService";
import { getConfiguracion } from "@/lib/huellitas/service";
import { CONFIGURACION_DEFAULT } from "@/lib/huellitas/types";
import { ClientesAdminTabs } from "@/components/admin/ClientesAdminTabs";
import { listarAlertasEncuestaPendientes } from "@/lib/huellitas/encuestasAlertasService";

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
  let alertasIniciales = 0;
  try {
    alertasIniciales = (await listarAlertasEncuestaPendientes(localId)).length;
  } catch {
    // panel de alertas vacío si falla la query
  }

  let premios: Awaited<ReturnType<typeof listarPremiosAdmin>> = [];
  try {
    cfg = await getConfiguracion(localId);
  } catch {
    // Mantenemos defaults para que el panel se renderice aunque falle la config.
  }
  try {
    premios = await listarPremiosAdmin(localId);
  } catch {
    // El canje manual requiere premios; si falla, el modal mostrará lista vacía.
  }

  return (
    <div>
      <div className="mb-8">
        <span className="label-elegant">Cartera</span>
        <h1 className="mt-2 font-display text-4xl font-semibold text-bark-700">
          Clientes y mascotas
        </h1>
        <p className="mt-2 max-w-xl text-[color:var(--muted)]">
          Buscá por nombre, email o teléfono, gestioná alertas de insatisfacción
          y recuperá clientes con disculpas compensatorias.
        </p>
      </div>

      {avisoCarga ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No pudimos sincronizar la lista inicial. Podés buscar igual; si el
          problema persiste, revisá la conexión con Firestore.
          <span className="mt-1 block text-xs text-amber-800/80">{avisoCarga}</span>
        </div>
      ) : null}

      <ClientesAdminTabs
        clientesIniciales={clientesIniciales}
        premios={premios}
        niveles={cfg.niveles}
        valorMonetarioHuellita={cfg.valorMonetarioHuellita}
        montoParaUnaHuellita={cfg.montoParaUnaHuellita}
        alertasIniciales={alertasIniciales}
      />
    </div>
  );
}
