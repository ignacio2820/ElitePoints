import { redirect } from "next/navigation";
import { MembresiaCheckout } from "@/components/admin/MembresiaCheckout";
import { getSesion } from "@/lib/auth/server";
import { getInfoLocal, membresiaActiva } from "@/lib/huellitas/localService";
import { PLANES_PAGO_PUBLICO, trialVigente } from "@/lib/huellitas/membresia";

export const dynamic = "force-dynamic";

export default async function PagosAdminPage() {
  const sesion = await getSesion();
  if (!sesion || sesion.claims.role !== "admin") {
    redirect("/login?intent=admin&redirect=/admin/pagos");
  }

  const info = await getInfoLocal(sesion.claims.localId);
  const accesoActivo = membresiaActiva(info);
  const trialActivo = trialVigente(info);
  const fechaReferencia = info.fechaVencimiento ?? info.trialHasta;

  return (
    <div className="space-y-6">
      <div>
        <span className="label-elegant">Suscripción</span>
        <h1 className="mt-2 font-display text-4xl font-semibold text-bark-700">
          Activá tu comercio
        </h1>
        <p className="mt-2 max-w-2xl text-[color:var(--muted)]">
          Elegí un plan para habilitar la caja registradora. Si te
          regalamos días de prueba, el acceso se habilita automáticamente hasta
          la fecha de <code className="text-bark-600">trialHasta</code> en
          Firestore.
        </p>
      </div>

      <MembresiaCheckout
        membresiaActiva={accesoActivo}
        fechaVencimiento={fechaReferencia?.toISOString()}
        planes={PLANES_PAGO_PUBLICO}
        trialActivo={trialActivo}
      />
    </div>
  );
}
