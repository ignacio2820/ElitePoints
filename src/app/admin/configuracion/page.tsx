import { redirect } from "next/navigation";
import { ConfiguracionForm } from "@/components/ConfiguracionForm";
import { DatosLocalForm } from "@/components/admin/DatosLocalForm";
import { GenerarQrPosterButton } from "@/components/admin/GenerarQrPosterButton";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getSesion } from "@/lib/auth/server";
import {
  CONFIGURACION_DEFAULT,
  type ConfiguracionLocal
} from "@/lib/huellitas/types";
import type { InfoLocal } from "@/lib/huellitas/localService";
import { guardarConfiguracion } from "./actions";

export const dynamic = "force-dynamic";

async function cargarConfiguracion(localId: string): Promise<ConfiguracionLocal> {
  try {
    const { getConfiguracion } = await import("@/lib/huellitas/service");
    return await getConfiguracion(localId);
  } catch {
    return { ...CONFIGURACION_DEFAULT, localId };
  }
}

async function cargarInfoLocal(localId: string): Promise<InfoLocal> {
  try {
    const { getInfoLocal } = await import("@/lib/huellitas/localService");
    return await getInfoLocal(localId);
  } catch {
    return { id: localId, nombre: localId };
  }
}

export default async function ConfiguracionPage() {
  const sesion = await getSesion();
  if (!sesion || sesion.claims.role !== "admin") {
    redirect("/login?intent=admin&redirect=/admin/configuracion");
  }
  const { localId } = sesion.claims;
  const [cfg, info] = await Promise.all([
    cargarConfiguracion(localId),
    cargarInfoLocal(localId)
  ]);

  return (
    <div className="space-y-10">
      <div>
        <span className="label-elegant">Reglas del local</span>
        <h1 className="mt-2 font-display text-4xl font-semibold text-bark-700">
          Configuracion del programa
        </h1>
        <p className="mt-2 max-w-2xl text-[color:var(--muted)]">
          Defini como funciona Huellitas en tu local. Los cambios afectan solo a
          las proximas ventas y se versionan automaticamente.
        </p>
      </div>

      <DatosLocalForm initial={info} />

      <Card>
        <CardHeader>
          <span className="label-elegant">Marketing del local</span>
          <CardTitle className="mt-2">Póster con QR de registro</CardTitle>
          <CardDescription>
            Generá un póster A4 con el logo de tu comercio y un QR único para que
            tus clientes se registren en Huellitas.
          </CardDescription>
        </CardHeader>
        <GenerarQrPosterButton />
      </Card>

      <ConfiguracionForm initial={cfg} onSave={guardarConfiguracion} />
    </div>
  );
}
