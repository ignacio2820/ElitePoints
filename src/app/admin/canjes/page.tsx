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
      <div>
        <div className="flex items-center gap-2 text-bark-400">
          <Ticket size={16} />
          <span className="label-elegant">Caja · Canjes</span>
        </div>
        <h1 className="mt-2 font-display text-4xl font-semibold text-bark-700">
          Tickets pendientes
        </h1>
        <p className="mt-2 max-w-2xl text-[color:var(--muted)]">
          Aca aparecen los canjes que solicitaron tus clientes. Pedi el codigo
          al cliente y confirma para descontarle las Huellitas y entregarle el
          premio.
        </p>
      </div>

      <CanjesPendientesPanel ticketsIniciales={tickets} />
    </div>
  );
}
