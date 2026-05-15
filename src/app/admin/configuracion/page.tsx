import { redirect } from "next/navigation";
import { ConfiguracionForm } from "@/components/ConfiguracionForm";
import { DatosLocalForm } from "@/components/admin/DatosLocalForm";
import { GenerarQrPosterButton } from "@/components/admin/GenerarQrPosterButton";
import { PasswordAccesoForm } from "@/components/admin/PasswordAccesoForm";
import { RegistrarPasskeyButton } from "@/components/auth/RegistrarPasskeyButton";
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
      <header>
        <span className="inline-block rounded-full bg-terracotta-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-terracotta-500">
          Reglas del local
        </span>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-bark-700 sm:text-5xl">
          Configuración del programa
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-bark-600">
          Definí cómo funciona Huellitas en tu local. Los cambios afectan solo a
          las próximas ventas y se versionan automáticamente.
        </p>
      </header>

      <DatosLocalForm initial={info} />

      <PasswordAccesoForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-bark-700">
            Acceso con huella o passkey
          </CardTitle>
          <CardDescription className="text-bark-600">
            Registrá una passkey en este dispositivo para entrar sin esperar el
            email del magic link.
          </CardDescription>
        </CardHeader>
        <RegistrarPasskeyButton className="px-1 pb-2" />
      </Card>

      <Card>
        <CardHeader>
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.18em] text-terracotta-500">
            Marketing del local
          </span>
          <CardTitle className="mt-2 text-2xl font-bold text-bark-700">
            Póster con QR de registro
          </CardTitle>
          <CardDescription className="text-bark-600">
            Generá un póster A4 con el logo de tu comercio y un QR único para
            que tus clientes se registren en Huellitas.
          </CardDescription>
        </CardHeader>
        <GenerarQrPosterButton />
      </Card>

      <ConfiguracionForm initial={cfg} onSave={guardarConfiguracion} />
    </div>
  );
}
