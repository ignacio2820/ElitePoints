import Link from "next/link";
import { HuellitaIcon, HuellitasStack } from "@/components/HuellitaIcon";

export default function Home() {
  return (
    <main className="paw-bg min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <HuellitaIcon size={28} className="text-bark-400" />
          <span className="font-display text-xl font-semibold text-bark-700">
            Huellitas
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/admin/configuracion" className="btn-ghost text-sm">
            Panel del local
          </Link>
          <Link href="/cliente/demo" className="btn-primary text-sm">
            Vista del cliente
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="label-elegant text-bark-400">
              Programa de fidelidad multi-tenant
            </span>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] text-bark-700 md:text-6xl">
              Cada huellita,
              <br />
              una vuelta más
              <br />
              a tu local.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[color:var(--muted)]">
              Configurá cuánto vale acumular y cuánto vale canjear. Cuidá tu margen
              con advertencias inteligentes. Festejá el cumpleaños de cada mascota.
              Todo en una sola plataforma elegante y transparente.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/admin/configuracion" className="btn-primary">
                Configurar mi programa
              </Link>
              <Link href="/cliente/demo" className="btn-ghost">
                Ver experiencia del cliente
              </Link>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-4 max-w-md">
              <Stat label="Costo de Acumulación" value="$1.000" hint="por huellita" />
              <Stat label="Valor de Canje" value="$10" hint="por huellita" />
              <Stat label="Vencimiento" value="365 d" hint="default" />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="surface-card relative overflow-hidden p-8">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-terracotta-100 blur-2xl opacity-70" />
              <div className="relative">
                <div className="text-xs uppercase tracking-[0.16em] text-bark-400">
                  Tu saldo
                </div>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="font-display text-6xl font-semibold text-bark-700">
                    100
                  </span>
                  <span className="text-lg text-[color:var(--muted)]">Huellitas</span>
                </div>
                <div className="mt-2 text-base text-bark-500">
                  Equivalen a <strong>$1.000</strong> de descuento
                </div>
                <HuellitasStack count={6} className="mt-6" />
                <div className="mt-8 rounded-2xl bg-cream-100 p-4 text-sm text-bark-500">
                  Esta es la vista que ve el cliente. Saldo, equivalente en pesos
                  y huellitas estilizadas.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-bark-400">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-semibold text-bark-700">
        {value}
      </div>
      {hint ? (
        <div className="text-xs text-[color:var(--muted)]">{hint}</div>
      ) : null}
    </div>
  );
}
