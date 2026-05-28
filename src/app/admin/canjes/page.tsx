import { redirect } from "next/navigation";
import { Ticket } from "lucide-react";
import { getSesion } from "@/lib/auth/server";
import { listarTicketsPendientes } from "@/lib/huellitas/canjeService";
import { CanjesPendientesPanel } from "@/components/admin/CanjesPendientesPanel";

export const dynamic = "force-dynamic";

export default async function CanjesPendientesPage() {
  const sesion = await getSesion();
  if (!sesion || sesion.claims.role !== "admin") {
    redirect("/login?intent=admin&redirect=/admin/canjes");
  }

  let tickets = [] as Awaited<ReturnType<typeof listarTicketsPendientes>>;
  try {
    tickets = await listarTicketsPendientes(sesion.claims.localId);
  } catch (e) {
    console.error("[admin/canjes] listar pendientes", e);
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full bg-terracotta-50 px-3 py-1 text-terracotta-500">
          <Ticket size={14} />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
            Caja · Canjes
          </span>
        </div>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-bark-700 sm:text-5xl">
          Tickets pendientes
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-bark-600">
          Acá aparecen los canjes que solicitaron tus clientes. Pedíle el
          código (o escaneále el QR) y confirmá para descontarle las Puntos
          y entregarle el premio.
        </p>
      </header>

      <CanjesPendientesPanel ticketsIniciales={tickets} />
    </div>
  );
}
