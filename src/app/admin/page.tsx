import Link from "next/link";
import {
  ArrowRight,
  Cake,
  ScanLine,
  Settings2,
  Users,
  type LucideIcon
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { requireAdmin } from "@/lib/auth/server";
import { getInfoLocal } from "@/lib/huellitas/localService";

export const dynamic = "force-dynamic";

const CAJA_CARD_CLASS =
  "rounded-2xl border border-amber-200/80 bg-gradient-to-br from-[#FFFCF4] via-cream-50 to-cream-100/80 p-6 shadow-soft ring-1 ring-amber-100/60 transition hover:-translate-y-0.5 hover:border-amber-300/80 hover:shadow-soft";

export default async function AdminDashboard() {
  const sesion = await requireAdmin();
  const localId = sesion.claims.localId;
  const info = await getInfoLocal(localId);

  return (
    <div>
      <div className="mb-10">
        <span className="label-elegant">Panel del local</span>
        <h1 className="mt-2 font-display text-4xl font-semibold text-bark-700">
          Bienvenido de vuelta, {info.nombre}
        </h1>
        <p className="mt-2 max-w-xl text-[color:var(--muted)]">
          Acá podés registrar ventas, configurar tu programa, ver clientes y
          monitorear cumpleaños próximos.
        </p>
      </div>

      <DashboardStats localId={localId} />

      <Link href="/admin/nueva-venta" className="group mb-6 block">
        <div className={CAJA_CARD_CLASS}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-200/70 bg-cream-50 text-amber-700">
                <ScanLine size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700/80">
                  Caja registradora
                </p>
                <h2 className="font-display text-2xl font-semibold text-bark-700">
                  Registrar nueva venta
                </h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Acreditá huellitas al instante y subí el nivel del cliente.
                </p>
              </div>
            </div>
            <ArrowRight className="text-amber-600/70 transition group-hover:translate-x-1 group-hover:text-amber-700" />
          </div>
        </div>
      </Link>

      <div className="grid gap-6 md:grid-cols-3">
        <DashboardCard
          href="/admin/configuracion"
          title="Configuración"
          description="Ajustá costo de acumulación, valor de canje y vencimiento."
          Icon={Settings2}
        />
        <DashboardCard
          href="/admin/clientes"
          title="Clientes y mascotas"
          description="Gestioná clientes, mascotas, saldos y movimientos."
          Icon={Users}
        />
        <DashboardCard
          href="/admin/clientes"
          title="Cumpleaños"
          description="Quiénes cumplen pronto y a quiénes ya saludamos."
          Icon={Cake}
        />
      </div>
    </div>
  );
}

function DashboardCard({
  href,
  title,
  description,
  Icon
}: {
  href: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-soft">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-100 text-bark-500">
              <Icon size={18} />
            </div>
            <CardTitle className="text-xl">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-bark-500 transition group-hover:gap-2.5 group-hover:text-bark-700">
          Abrir
          <ArrowRight size={14} />
        </div>
      </Card>
    </Link>
  );
}
