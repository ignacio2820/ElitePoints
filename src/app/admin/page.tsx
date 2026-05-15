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
import { ActivarPasskeyAviso } from "@/components/admin/ActivarPasskeyAviso";
import { AlertasCanjeDashboard } from "@/components/admin/AlertasCanjeDashboard";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { requireAdmin } from "@/lib/auth/server";
import { getInfoLocal } from "@/lib/huellitas/localService";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const sesion = await requireAdmin();
  const localId = sesion.claims.localId;
  const info = await getInfoLocal(localId);
  const tieneNombre = info.nombre.trim().length > 0 && info.nombre !== localId;
  const saludo = tieneNombre ? info.nombre : "tu Pet Shop";

  return (
    <div>
      <section className="mb-10">
        <span className="inline-block rounded-full bg-bark-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-bark-700">
          Panel del local
        </span>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-bark-700 sm:text-5xl">
          Bienvenido de vuelta,
          <br className="hidden sm:block" />
          <span className="text-terracotta-400">{saludo}</span>
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-bark-600">
          Registrá ventas en caja, configurá tu programa, monitoreá clientes y
          cumpleaños desde un solo lugar.
        </p>
      </section>

      <Link
        href="/admin/nueva-venta"
        className="group mb-10 block focus:outline-none"
      >
        <div className="relative overflow-hidden rounded-3xl bg-terracotta-400 p-6 text-white shadow-soft ring-1 ring-terracotta-500/20 transition hover:-translate-y-0.5 hover:bg-terracotta-500 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/15 blur-2xl"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
                <ScanLine size={26} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/85">
                  Caja registradora
                </p>
                <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
                  Registrar nueva venta
                </h2>
                <p className="mt-1 max-w-md text-sm text-white/90">
                  Acreditá huellitas al instante y subí el nivel del cliente.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-terracotta-500 shadow-soft transition group-hover:gap-3">
              Abrir caja
              <ArrowRight size={16} />
            </span>
          </div>
        </div>
      </Link>

      <ActivarPasskeyAviso uid={sesion.uid} />

      <AlertasCanjeDashboard localId={localId} />

      <DashboardStats localId={localId} />

      <section>
        <h2 className="mb-5 font-display text-2xl font-bold text-bark-700">
          Accesos rápidos
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          <DashboardCard
            href="/admin/configuracion"
            title="Configuración"
            description="Costo de acumulación, valor de canje y vencimiento."
            Icon={Settings2}
          />
          <DashboardCard
            href="/admin/clientes"
            title="Clientes y mascotas"
            description="Saldos, movimientos y mascotas registradas."
            Icon={Users}
          />
          <DashboardCard
            href="/admin/clientes"
            title="Cumpleaños"
            description="Quiénes cumplen pronto y a quiénes saludamos."
            Icon={Cake}
          />
        </div>
      </section>
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
      <Card className="h-full rounded-3xl transition hover:-translate-y-0.5 hover:shadow-soft">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-terracotta-50 text-terracotta-500">
              <Icon size={20} />
            </div>
            <CardTitle className="text-xl font-bold text-bark-700">
              {title}
            </CardTitle>
          </div>
          <CardDescription className="text-bark-600">
            {description}
          </CardDescription>
        </CardHeader>
        <div className="inline-flex items-center gap-1.5 text-sm font-bold text-terracotta-500 transition group-hover:gap-2.5">
          Abrir
          <ArrowRight size={14} />
        </div>
      </Card>
    </Link>
  );
}
