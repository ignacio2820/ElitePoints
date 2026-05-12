import Link from "next/link";
import {
  ArrowRight,
  Bone,
  Gift,
  LogOut,
  Package,
  PawPrint,
  ShoppingBag,
  Stethoscope
} from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { LocalBrandMark } from "@/components/LocalBrandMark";
import type { NivelLealtad } from "@/lib/huellitas/types";
import { formatARS, formatHuellitas, formatNumber } from "@/lib/utils";

export interface CustomerPanelProps {
  nombreLocal: string;
  logoUrl?: string | null;
  nombreCliente: string;
  saldoHuellitas: number;
  valorMonetarioHuellita: number;
  nivelActual: NivelLealtad;
  pctTramo: number;
  nivelSiguienteNombre: string | null;
  huellitasFaltantes: number;
  esLeyenda: boolean;
  montoParaUnaHuellita: number;
  diasVencimiento: number;
  recompensas?: React.ReactNode;
  children?: React.ReactNode;
}

const NAV_LINKS = [
  { href: "/mi-cuenta", label: "Mi Cuenta" },
  { href: "/mi-cuenta#catalogo", label: "Catálogo" },
  { href: "/mi-cuenta/qr", label: "Mi QR" },
  { href: "#ayuda", label: "Ayuda" }
] as const;

export function CustomerPanel({
  nombreLocal,
  logoUrl,
  nombreCliente,
  saldoHuellitas,
  valorMonetarioHuellita,
  nivelActual,
  pctTramo,
  nivelSiguienteNombre,
  huellitasFaltantes,
  esLeyenda,
  montoParaUnaHuellita,
  diasVencimiento,
  recompensas,
  children
}: CustomerPanelProps) {
  const primerNombre = nombreCliente.split(" ")[0] ?? nombreCliente;
  const saldoEntero = formatHuellitas(saldoHuellitas);
  const progresoPct = Math.max(0, Math.min(100, pctTramo * 100));

  return (
    <div className="min-h-screen bg-bark-900 lg:flex">
      <aside className="relative flex w-full shrink-0 flex-col bg-bark-900 px-5 py-6 text-white lg:w-[17.5rem] lg:px-6 lg:py-8">
        <div className="flex items-center gap-2">
          <HuellitaIcon size={22} className="text-terracotta-400" />
          <div className="font-display text-xl font-extrabold leading-none tracking-tight">
            <span className="text-white">Mascot</span>
            <span className="text-terracotta-400">Points</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center text-center lg:mt-10">
          <div className="rounded-full bg-white/10 p-1 ring-4 ring-white/15">
            <LocalBrandMark
              nombreLocal={nombreLocal}
              logoUrl={logoUrl}
              size={88}
              imageClassName="border-white/20 bg-white"
              iconClassName="text-bark-600"
            />
          </div>
          <p className="mt-4 font-display text-lg font-bold text-white">{nombreCliente}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/90">
            {nombreLocal}
          </p>
        </div>

        <div className="mt-8 lg:mt-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/90">
            Actividad reciente
          </p>
          <ul className="mt-4 space-y-4 text-sm">
            <li className="border-b border-white/10 pb-4">
              <p className="font-semibold text-white">Programa activo</p>
              <p className="mt-1 text-xs text-white/90">
                Hola, {primerNombre}. Tus movimientos del local aparecerán acá.
              </p>
              <p className="mt-2 text-sm font-bold text-terracotta-300">
                +{formatNumber(saldoHuellitas)} huellitas disponibles
              </p>
            </li>
            <li>
              <p className="font-semibold text-white">Rango actual</p>
              <p className="mt-1 text-xs text-white/90">{nivelActual.nombre}</p>
              <p className="mt-2 text-sm font-bold text-terracotta-300">
                {formatNumber(saldoHuellitas)} huellitas en saldo
              </p>
            </li>
          </ul>
        </div>

        <div
          aria-hidden
          className="pointer-events-none mt-auto hidden pt-10 text-terracotta-400/70 lg:flex lg:flex-col lg:gap-3"
        >
          <PawPrint size={18} className="rotate-12" />
          <PawPrint size={14} className="-translate-x-1 rotate-[-18deg]" />
          <PawPrint size={16} className="translate-x-2 rotate-6" />
        </div>

        <form action="/api/auth/logout" method="POST" className="mt-6 lg:mt-8">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col rounded-t-[2rem] bg-cream-50 lg:rounded-tl-[2.5rem] lg:rounded-tr-none">
        <header className="border-b border-bark-100/80 bg-bark-900/95 px-4 py-4 text-white lg:rounded-tl-[2.5rem] lg:px-8">
          <nav className="flex flex-wrap items-center gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15"
              >
                {link.label === "Mi Cuenta" ? <PawPrint size={14} /> : null}
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="rounded-[2rem] bg-white p-5 shadow-soft lg:p-8">
            <div className="mb-6 flex items-center gap-2">
              <HuellitaIcon size={24} className="text-terracotta-400" />
              <h1 className="font-display text-2xl font-bold text-bark-900">Huellita</h1>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-[1.75rem] bg-bark-900 p-6 text-white shadow-soft lg:p-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">
                  Tus huellitas acumuladas
                </p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="font-display text-5xl font-extrabold leading-none text-terracotta-400 lg:text-6xl">
                    {saldoEntero}
                  </span>
                  <span className="pb-2 text-sm font-bold uppercase tracking-[0.16em] text-terracotta-300">
                    Huellitas
                  </span>
                </div>

                <div className="mt-6">
                  <div className="h-3 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-terracotta-400 transition-all duration-500"
                      style={{ width: `${progresoPct}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-white/90">
                    <span>{nivelActual.nombre}</span>
                    {!esLeyenda && nivelSiguienteNombre ? (
                      <span>
                        ¡Te faltan {formatNumber(huellitasFaltantes)} para {nivelSiguienteNombre}!
                      </span>
                    ) : (
                      <span>Nivel máximo alcanzado</span>
                    )}
                  </div>
                </div>

                <Link
                  href="#catalogo"
                  className="btn-primary mt-6 inline-flex w-full justify-center lg:w-auto"
                >
                  Ver recompensas
                  <ArrowRight size={16} />
                </Link>
              </section>

              <section id="catalogo" className="space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-bark-500">
                    Recompensas disponibles
                  </p>
                  <p className="mt-1 text-sm text-bark-500">
                    Elegí un premio y canjealo con tus Huellitas.
                  </p>
                </div>
                {recompensas}
              </section>
            </div>

            <section
              id="ayuda"
              className="mt-8 rounded-[1.75rem] border border-bark-100 bg-cream-50 p-5 lg:p-6"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-bark-500">
                Cómo sumar más huellitas
              </p>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
                <div className="flex items-start gap-3 rounded-2xl bg-white p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-bark-100 bg-cream-50 text-bark-700">
                    <Gift size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-bark-700">Registrate</p>
                    <p className="mt-1 text-sm text-bark-500">
                      Sumate al programa del local y empezá a acumular con tu cuenta.
                    </p>
                  </div>
                </div>
                <ArrowRight size={18} className="mx-auto hidden text-bark-300 lg:block" />
                <div className="flex items-start gap-3 rounded-2xl bg-white p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-bark-100 bg-cream-50 text-bark-700">
                    <Stethoscope size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-bark-700">Primera consulta</p>
                    <p className="mt-1 text-sm text-bark-500">
                      Visitá el local y pedí que sumen tus Huellitas en caja.
                    </p>
                  </div>
                </div>
                <ArrowRight size={18} className="mx-auto hidden text-bark-300 lg:block" />
                <div className="flex items-start gap-3 rounded-2xl bg-white p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-bark-100 bg-cream-50 text-bark-700">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-bark-700">
                      Por cada {formatARS(montoParaUnaHuellita)} gastados
                    </p>
                    <p className="mt-1 text-sm text-bark-500">
                      Cada huellita vale {formatARS(valorMonetarioHuellita)} y vence a los{" "}
                      {diasVencimiento} días.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {children ? <div className="mt-8 space-y-5">{children}</div> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
