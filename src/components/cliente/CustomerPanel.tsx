import Link from "next/link";
import {
  ArrowRight,
  Gift,
  LogOut,
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
  /**
   * Saldo DISPONIBLE (saldoHuellitas - huellitasReservadas). Es lo que el
   * cliente puede gastar ahora. Si tiene tickets pendientes, esas huellitas
   * NO están aquí; aparecen como "reservadas".
   */
  saldoHuellitas: number;
  /** Huellitas en tickets pendientes (canjes solicitados sin confirmar). */
  huellitasReservadas?: number;
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
  huellitasReservadas = 0,
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
    <div className="min-h-screen bg-bark-700 text-white lg:flex">
      <aside className="relative flex w-full shrink-0 flex-col border-b border-white/10 bg-bark-800 px-5 py-6 lg:w-[17.5rem] lg:border-b-0 lg:border-r lg:border-white/10 lg:px-6 lg:py-8">
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
              iconClassName="text-bark-700"
            />
          </div>
          <p className="mt-4 font-display text-lg font-bold text-white">
            {nombreCliente}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
            {nombreLocal}
          </p>
        </div>

        <div className="mt-8 lg:mt-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
            Actividad reciente
          </p>
          <ul className="mt-4 space-y-4 text-sm">
            <li className="border-b border-white/10 pb-4">
              <p className="font-semibold text-white">Programa activo</p>
              <p className="mt-1 text-xs text-white/75">
                Hola, {primerNombre}. Tus movimientos del local aparecerán acá.
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-terracotta-300">
                <HuellitaIcon size={14} className="text-terracotta-300" />
                +{formatNumber(saldoHuellitas)} disponibles
              </p>
            </li>
            <li>
              <p className="font-semibold text-white">Rango actual</p>
              <p className="mt-1 text-xs text-white/75">{nivelActual.nombre}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-terracotta-300">
                <HuellitaIcon size={14} className="text-terracotta-300" />
                {formatNumber(saldoHuellitas)} en saldo
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

      <div className="flex min-w-0 flex-1 flex-col bg-bark-700">
        <header className="border-b border-white/10 px-4 py-4 lg:px-8">
          <nav className="flex flex-wrap items-center gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                {link.label === "Mi Cuenta" ? <PawPrint size={14} /> : null}
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mb-6 flex items-center gap-2">
            <HuellitaIcon size={24} className="text-terracotta-400" />
            <h1 className="font-display text-2xl font-bold text-white">
              Huellita
            </h1>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="relative overflow-hidden rounded-3xl bg-bark-800 p-6 shadow-soft ring-1 ring-white/5 lg:p-7">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-6 text-terracotta-400/20"
              >
                <PawPrint size={120} className="rotate-12" />
              </div>

              <div className="relative">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">
                  <HuellitaIcon size={12} className="text-terracotta-400" />
                  Tus huellitas acumuladas
                </p>

                <div className="mt-4 flex items-end gap-2">
                  <span className="font-display text-6xl font-extrabold leading-none text-terracotta-400 lg:text-7xl">
                    {saldoEntero}
                  </span>
                  <span className="pb-2 text-sm font-bold uppercase tracking-[0.16em] text-white/80">
                    Huellitas
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/70">
                  Equivalen a{" "}
                  <strong className="text-white">
                    {formatARS(saldoHuellitas * valorMonetarioHuellita)}
                  </strong>{" "}
                  en descuentos.
                </p>
                {huellitasReservadas > 0 ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                    <HuellitaIcon size={12} className="text-terracotta-300" />
                    {formatNumber(huellitasReservadas)} reservadas en canjes
                    pendientes
                  </p>
                ) : null}

                <div className="mt-6">
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-terracotta-400 transition-all duration-500"
                      style={{ width: `${progresoPct}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-white/85">
                    <span className="inline-flex items-center gap-1.5">
                      <PawPrint size={13} className="text-terracotta-300" />
                      {nivelActual.nombre}
                    </span>
                    {!esLeyenda && nivelSiguienteNombre ? (
                      <span>
                        ¡Te faltan {formatNumber(huellitasFaltantes)} para{" "}
                        {nivelSiguienteNombre}!
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
              </div>
            </section>

            <section id="catalogo" className="space-y-4">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">
                  <HuellitaIcon size={12} className="text-terracotta-400" />
                  Recompensas disponibles
                </p>
                <p className="mt-1 text-sm text-white/75">
                  Elegí un premio y canjealo con tus Huellitas.
                </p>
              </div>
              {recompensas}
            </section>
          </div>

          <section
            id="ayuda"
            className="mt-8 rounded-3xl bg-bark-800 p-5 shadow-soft ring-1 ring-white/5 lg:p-6"
          >
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">
              <HuellitaIcon size={12} className="text-terracotta-400" />
              Cómo sumar más huellitas
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
              <PasoCard
                icono={<Gift size={20} />}
                titulo="Registrate"
                texto="Sumate al programa del local y empezá a acumular con tu cuenta."
              />
              <ArrowRight
                size={18}
                className="mx-auto hidden text-white/40 lg:block"
              />
              <PasoCard
                icono={<Stethoscope size={20} />}
                titulo="Primera consulta"
                texto="Visitá el local y pedí que sumen tus Huellitas en caja."
              />
              <ArrowRight
                size={18}
                className="mx-auto hidden text-white/40 lg:block"
              />
              <PasoCard
                icono={<ShoppingBag size={20} />}
                titulo={`Por cada ${formatARS(montoParaUnaHuellita)} gastados`}
                texto={`Cada huellita vale ${formatARS(valorMonetarioHuellita)} y vence a los ${diasVencimiento} días.`}
              />
            </div>
          </section>

          {children ? <div className="mt-8 space-y-5">{children}</div> : null}
        </main>
      </div>
    </div>
  );
}

function PasoCard({
  icono,
  titulo,
  texto
}: {
  icono: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-3xl bg-white p-4 text-bark-700 shadow-soft">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-terracotta-50 text-terracotta-400">
        {icono}
      </div>
      <div>
        <p className="font-semibold text-bark-700">{titulo}</p>
        <p className="mt-1 text-sm text-bark-500">{texto}</p>
      </div>
    </div>
  );
}
