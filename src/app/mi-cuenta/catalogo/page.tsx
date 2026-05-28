import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { CatalogoClienteCanjes } from "@/components/cliente/CatalogoClienteCanjes";
import { getSesion } from "@/lib/auth/server";
import { getConfiguracion } from "@/lib/huellitas/service";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import {
  leerHuellitasActuales,
  progresoNivelCliente
} from "@/lib/huellitas/saldosCliente";
import { mapPremiosFromDocs } from "@/lib/huellitas/mapPremiosFirestore";
import type { Cliente } from "@/lib/huellitas/types";

export const dynamic = "force-dynamic";

export default async function MiCuentaCatalogoPage() {
  const sesion = await getSesion();
  if (!sesion?.claims.clienteId) redirect("/login?intent=cliente");

  const { localId, clienteId } = sesion.claims;
  const db = adminDb();

  const [clienteSnap, cfg, premiosSnap] = await Promise.all([
    cols.cliente(db, localId, clienteId).get(),
    getConfiguracion(localId),
    cols.premios(db, localId).where("activo", "==", true).get()
  ]);

  if (!clienteSnap.exists) redirect("/login?intent=cliente");

  const clienteRaw = clienteSnap.data() as Cliente;
  const saldoBruto = leerHuellitasActuales(clienteRaw);
  const reservadas = Number(clienteRaw.huellitasReservadas ?? 0);
  const saldoDisponible = Math.max(0, saldoBruto - reservadas);
  const progreso = progresoNivelCliente(clienteRaw, cfg.niveles);
  const premios = mapPremiosFromDocs(premiosSnap.docs);

  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <header className="sticky top-0 z-10 border-b border-bark-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
          <Link
            href="/mi-cuenta"
            className="inline-flex items-center gap-2 text-sm font-semibold text-bark-600 hover:text-bark-800"
          >
            <ArrowLeft size={16} />
            Volver a mi cuenta
          </Link>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <h1 className="font-display text-2xl font-extrabold text-bark-800">
            Catálogo de recompensas
          </h1>
          <p className="mt-1 text-sm text-bark-500">
            Canjeá tus Puntos por premios del comercio.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <CatalogoClienteCanjes
          saldoDisponibleInicial={saldoDisponible}
          huellitasReservadas={reservadas}
          premios={premios}
          valorMonetarioHuellita={cfg.valorMonetarioHuellita}
          nivelCliente={progreso.nivelActual}
          niveles={cfg.niveles}
        />
      </main>
    </div>
  );
}
