import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { SorteosClientePanel } from "@/components/cliente/SorteosClientePanel";
import { getSesion } from "@/lib/auth/server";
import { leerHuellitasActuales } from "@/lib/huellitas/saldosCliente";
import type { Cliente } from "@/lib/huellitas/types";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";

export const dynamic = "force-dynamic";

export default async function MiCuentaSorteosPage() {
  const sesion = await getSesion();
  if (!sesion?.claims.clienteId) redirect("/login?intent=cliente");

  const { localId, clienteId } = sesion.claims;
  const snap = await cols.cliente(adminDb(), localId, clienteId).get();
  if (!snap.exists) redirect("/login?intent=cliente");

  const saldo = leerHuellitasActuales(snap.data() as Cliente);

  return (
    <div className="min-h-screen bg-bark-700 pb-24">
      <header className="border-b border-white/10 px-4 py-4">
        <Link
          href="/mi-cuenta"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white"
        >
          <ArrowLeft size={16} />
          Volver a mi cuenta
        </Link>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">
        <SorteosClientePanel saldoInicial={saldo} />
      </main>
    </div>
  );
}
