import Link from "next/link";
import { PuntosStack } from "@/components/PuntoIcon";
import { ElitePointsLogo } from "@/components/ElitePointsLogo";
import { LandingMarketingSections } from "@/components/landing/LandingMarketingSections";

export default function Home() {
  return (
    <main className="paw-bg min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <ElitePointsLogo height={40} priority imageClassName="brightness-0 invert" />
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/admin/configuracion" className="btn-ghost text-sm">
            Panel del comercio
          </Link>
          <Link href="/cliente/demo?localId=demo" className="btn-primary text-sm">
            Vista del cliente
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="label-elegant text-bark-200">
              Programa de fidelidad multi-tenant
            </span>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] text-white md:text-6xl">
              Cada punto,
              <br />
              una vuelta más
              <br />
              a tu comercio.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-bark-100">
              Configurá cuánto vale acumular y cuánto vale canjear. Cuidá tu margen
              con advertencias inteligentes. Premios, sorteos y referidos en un solo
              panel elegante y transparente.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/onboarding" className="btn-primary">
                Registrar mi comercio
              </Link>
              <Link href="/login" className="btn-ghost">
                Ingresar al panel
              </Link>
            </div>

            <div className="mt-14 grid max-w-md grid-cols-3 gap-4">
              <Stat label="Costo de Acumulación" value="$1.000" hint="por punto" />
              <Stat label="Valor de Canje" value="$10" hint="por punto" />
              <Stat label="Vencimiento" value="365 d" hint="default" />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="surface-card relative overflow-hidden rounded-3xl p-8">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-terracotta-100 blur-2xl opacity-70" />
              <div className="relative text-bark-700">
                <div className="text-xs uppercase tracking-[0.16em] text-bark-400">
                  Tu saldo
                </div>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="font-display text-6xl font-semibold text-bark-700">
                    100
                  </span>
                  <span className="text-lg text-bark-500">Puntos</span>
                </div>
                <div className="mt-2 text-base text-bark-500">
                  Equivalen a <strong>$1.000</strong> de descuento
                </div>
                <PuntosStack count={6} className="mt-6" />
                <div className="mt-8 rounded-2xl bg-cream-100 p-4 text-sm text-bark-500">
                  Esta es la vista que ve el cliente. Saldo, equivalente en pesos
                  y puntos estilizados.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingMarketingSections />
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
      <div className="text-[11px] uppercase tracking-widest text-bark-200">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-semibold text-white">
        {value}
      </div>
      {hint ? <div className="text-xs text-bark-200">{hint}</div> : null}
    </div>
  );
}
