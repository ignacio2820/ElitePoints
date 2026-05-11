import { NuevaVentaForm } from "./NuevaVentaForm";
import { requireAdmin } from "@/lib/auth/server";
import { requireMembresiaActiva } from "@/lib/huellitas/requireMembresiaActiva";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { getConfiguracion } from "@/lib/huellitas/service";
import { CONFIGURACION_DEFAULT, type ConfiguracionLocal } from "@/lib/huellitas/types";

export const dynamic = "force-dynamic";

async function safeGetConfig(localId: string): Promise<{
  cfg: ConfiguracionLocal;
  fuente: "firestore" | "fallback";
  error?: string;
}> {
  try {
    const cfg = await getConfiguracion(localId);
    return { cfg, fuente: "firestore" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return {
      cfg: {
        ...CONFIGURACION_DEFAULT,
        localId,
        montoParaUnaHuellita: 100,
        valorMonetarioHuellita: 5
      },
      fuente: "fallback",
      error: msg
    };
  }
}

export default async function NuevaVentaPage({
  searchParams
}: {
  searchParams?: { cliente?: string };
}) {
  const sesion = await requireAdmin();
  const localId = sesion.claims.localId;
  await requireMembresiaActiva(localId);

  const [{ cfg, fuente, error }, localSnap] = await Promise.all([
    safeGetConfig(localId),
    cols.local(adminDb(), localId).get()
  ]);
  const nombreLocal =
    (localSnap.data() as { nombre?: string } | undefined)?.nombre ?? localId;

  return (
    <NuevaVentaForm
      localId={localId}
      nombreLocal={nombreLocal}
      montoParaUnaHuellita={cfg.montoParaUnaHuellita}
      valorMonetarioHuellita={cfg.valorMonetarioHuellita}
      niveles={cfg.niveles}
      configFuente={fuente}
      configError={error}
      clienteIdInicial={searchParams?.cliente ?? ""}
    />
  );
}
