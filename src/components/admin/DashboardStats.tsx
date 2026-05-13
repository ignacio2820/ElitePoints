import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Heart,
  Sparkles,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import {
  getDashboardStats,
  type DashboardStats as TStats,
  type EmisionVsCanjeStats,
  type MascotaRanking,
  type RetencionStats
} from "@/lib/huellitas/dashboardStatsService";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { formatNumber } from "@/lib/utils";

/**
 * Panel de métricas del admin. Server component asíncrono: hace las 3
 * queries en paralelo y renderiza 3 cards.
 *
 * Si alguna query falla (ej. índice ausente o local recién creado sin
 * datos), mostramos un fallback claro en lugar de romper la página.
 */
export async function DashboardStats({ localId }: { localId: string }) {
  let stats: TStats | null = null;
  let errorMsg: string | null = null;
  try {
    stats = await getDashboardStats(localId);
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Error desconocido";
  }

  if (!stats) {
    return (
      <section className="mb-10">
        <CabeceraSeccion />
        <div className="flex items-start gap-3 rounded-3xl border border-terracotta-200 bg-terracotta-50 p-5 text-sm text-bark-700 shadow-soft">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-terracotta-500" />
          <div>
            <p className="font-bold text-bark-700">
              No pudimos cargar las métricas.
            </p>
            {errorMsg && (
              <p className="mt-1 text-xs text-bark-600">
                Detalle: {errorMsg}
              </p>
            )}
            <p className="mt-2 text-xs text-bark-600">
              Si tu local es nuevo, todavía no hay ventas registradas. Cargá la
              primera desde la Caja.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <CabeceraSeccion />
      <div className="grid gap-5 lg:grid-cols-3">
        <CardEmisionCanje stats={stats.emision} />
        <CardTopMascotas mascotas={stats.topMascotas} />
        <CardRetencion stats={stats.retencion} />
      </div>
    </section>
  );
}

function CabeceraSeccion() {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <span className="inline-block rounded-full bg-terracotta-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-terracotta-500">
          Pulse del local
        </span>
        <h2 className="mt-2 font-display text-2xl font-bold text-bark-700 sm:text-3xl">
          Métricas en vivo
        </h2>
      </div>
      <p className="text-xs text-bark-500">
        <code className="rounded bg-bark-50 px-1.5 py-0.5 font-mono text-[10px] text-bark-600">
          /Ventas
        </code>{" "}
        y{" "}
        <code className="rounded bg-bark-50 px-1.5 py-0.5 font-mono text-[10px] text-bark-600">
          /Canjes
        </code>{" "}
        de tu local (Admin SDK en servidor).
      </p>
    </div>
  );
}

// ─── Card 1: Emisión vs Canje ─────────────────────────────────────────────

function CardEmisionCanje({ stats }: { stats: EmisionVsCanjeStats }) {
  const max = Math.max(stats.emitidas, stats.canjeadas, 1);
  const pctEmitidas = (stats.emitidas / max) * 100;
  const pctCanjeadas = (stats.canjeadas / max) * 100;
  const ratioPct = Math.round(stats.ratioCanjeEmision * 100);

  // "Salud" del programa: si se canjea < 70% de lo emitido es saludable.
  const saludable = stats.ratioCanjeEmision < 0.7;
  const tono = saludable
    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : "text-rose-600 bg-rose-50 border-rose-200";

  return (
    <article className="card flex flex-col gap-5 rounded-3xl p-6">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-terracotta-500">
            Salud financiera · {stats.diasVentana}d
          </p>
          <h3 className="mt-1 font-display text-xl font-bold text-bark-700">
            Emisión vs Canje
          </h3>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tono}`}
          title="Porcentaje de huellitas emitidas que se canjearon"
        >
          {saludable ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {stats.emitidas > 0 ? `${ratioPct}%` : "—"}
        </span>
      </header>

      {/* Barras */}
      <div className="space-y-4">
        <Barra
          etiqueta="Emitidas"
          valor={stats.emitidas}
          pct={pctEmitidas}
          color="from-terracotta-300 to-terracotta-500"
          icono="up"
        />
        <Barra
          etiqueta="Canjeadas"
          valor={stats.canjeadas}
          pct={pctCanjeadas}
          color="from-bark-400 to-bark-600"
          icono="down"
        />
      </div>

      {/* Detalle */}
      <p className="text-[11px] leading-relaxed text-bark-600">
        <strong className="text-bark-700">Canjeadas</strong> = descuento con
        Huellitas en caja (campo de cada venta) + canjes de premios
        confirmados en <code className="font-mono">/Canjes</code>.
      </p>
      <footer className="grid grid-cols-2 gap-3 border-t border-bark-100 pt-3 text-xs text-bark-600">
        <div>
          <p className="font-bold uppercase tracking-widest text-bark-500">
            Docs en /Ventas
          </p>
          <p className="mt-0.5 font-display text-base font-bold text-bark-700">
            {formatNumber(stats.cantidadVentas)}
          </p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-widest text-bark-500">
            Docs en /Canjes
          </p>
          <p className="mt-0.5 font-display text-base font-bold text-bark-700">
            {formatNumber(stats.cantidadCanjes)}
          </p>
        </div>
      </footer>
    </article>
  );
}

function Barra({
  etiqueta,
  valor,
  pct,
  color,
  icono
}: {
  etiqueta: string;
  valor: number;
  pct: number;
  color: string;
  icono: "up" | "down";
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-bark-600">
          {icono === "up" ? (
            <ArrowUpRight size={12} className="text-amber-500" />
          ) : (
            <ArrowDownRight size={12} className="text-bark-500" />
          )}
          {etiqueta}
        </span>
        <span className="flex items-center gap-1 tabular-nums text-bark-700">
          <HuellitaIcon size={11} />
          <span className="font-display text-base font-bold">
            {formatNumber(valor)}
          </span>
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-bark-50">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-[width] duration-700 ease-out`}
          style={{ width: `${Math.max(pct, valor > 0 ? 4 : 0)}%` }}
          aria-label={`${etiqueta}: ${valor} huellitas`}
        />
      </div>
    </div>
  );
}

// ─── Card 2: Top mascotas ─────────────────────────────────────────────────

function CardTopMascotas({ mascotas }: { mascotas: MascotaRanking[] }) {
  return (
    <article className="card flex flex-col gap-4 rounded-3xl p-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-terracotta-500">
            Lealtad
          </p>
          <h3 className="mt-1 font-display text-xl font-bold text-bark-700">
            Top 5 Mascotas
          </h3>
          <p className="mt-0.5 text-[11px] text-bark-600">
            Por acumulado histórico de huellitas (atribución por hogar si hay
            varias mascotas).
          </p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-terracotta-50 text-terracotta-500">
          <Heart size={16} />
        </span>
      </header>

      {mascotas.length === 0 ? (
        <p className="rounded-2xl bg-cream-50 p-4 text-center text-xs text-bark-600">
          Cuando registres ventas con clientes que tengan mascotas,
          aparecerán acá.
        </p>
      ) : (
        <ol className="space-y-2">
          {mascotas.map((m, i) => (
            <li
              key={`${m.clienteId}-${m.nombreMascota}-${i}`}
              className="flex items-center gap-3 rounded-2xl bg-cream-50 px-3 py-2 transition hover:bg-cream-100"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-display text-xs font-bold ${
                  i === 0
                    ? "bg-terracotta-400 text-white shadow-sm"
                    : i === 1
                    ? "bg-terracotta-100 text-bark-700"
                    : i === 2
                    ? "bg-bark-100 text-bark-700"
                    : "bg-bark-50 text-bark-600"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold text-bark-700">
                  {m.nombreMascota}{" "}
                  <span className="text-xs font-medium text-bark-500">
                    · de {m.dueno}
                  </span>
                </p>
                <p className="truncate text-[11px] text-bark-600">
                  {especieLabel(m.especie)}
                  {m.raza ? ` · ${m.raza}` : ""}
                  {m.compartido ? " · acumulado del hogar" : ""}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 tabular-nums text-bark-700">
                <HuellitaIcon size={11} className="text-terracotta-400" />
                <span className="font-display text-sm font-bold">
                  {formatNumber(m.huellitasAcumuladas)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function especieLabel(e: MascotaRanking["especie"]): string {
  switch (e) {
    case "perro":
      return "Perro";
    case "gato":
      return "Gato";
    case "ave":
      return "Ave";
    case "reptil":
      return "Reptil";
    default:
      return "Otro";
  }
}

// ─── Card 3: Retención / Churn ────────────────────────────────────────────

function CardRetencion({ stats }: { stats: RetencionStats }) {
  const tasaPct = Math.round(stats.tasaRetencion * 100);
  const churnPct = Math.round(stats.tasaChurn * 100);

  // Convención simple: ≥ 70% retención = saludable.
  const saludable = stats.tasaRetencion >= 0.7;

  return (
    <article className="card flex flex-col gap-4 rounded-3xl p-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-terracotta-500">
            Retención / Churn · {stats.diasVentana} días
          </p>
          <h3 className="mt-1 font-display text-xl font-bold text-bark-700">
            ¿Vuelven tus clientes?
          </h3>
          <p className="mt-0.5 text-[11px] text-bark-600">
            Clientes con historial de compra sin ventas registradas en los
            últimos {stats.diasVentana} días cuentan como{" "}
            <strong className="text-bark-700">en riesgo</strong>.
          </p>
        </div>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
            saludable
              ? "bg-emerald-50 text-emerald-600"
              : "bg-rose-50 text-rose-500"
          }`}
        >
          {saludable ? <Sparkles size={16} /> : <AlertTriangle size={16} />}
        </span>
      </header>

      {/* Tasa principal */}
      <div className="rounded-2xl border border-bark-100 bg-cream-50 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-bark-600">
          Tasa de retención
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span
            className={`font-display text-4xl font-extrabold tabular-nums ${
              saludable ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {stats.totalConHistorial > 0 ? `${tasaPct}%` : "—"}
          </span>
          {stats.totalConHistorial > 0 && (
            <span className="text-xs font-medium text-bark-600">
              · churn {churnPct}%
            </span>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-bark-700">
          {stats.totalConHistorial === 0
            ? "Aún no tenés clientes con historial de compras."
            : `${stats.activos} de ${stats.totalConHistorial} clientes con historial volvieron a comprar en los últimos ${stats.diasVentana} días.`}
        </p>
      </div>

      {/* Detalle */}
      <ul className="grid grid-cols-3 gap-2 text-center">
        <Pill
          label="Activos"
          value={stats.activos}
          tone="emerald"
          hint="con compras recientes"
        />
        <Pill
          label={`Sin compra ${stats.diasVentana}d`}
          value={stats.enRiesgo}
          tone="rose"
          hint={`Clientes con historial que no registraron venta en ${stats.diasVentana} días`}
        />
        <Pill
          label="Nuevos"
          value={stats.nuevosSinCompras}
          tone="bark"
          hint="aún no compraron"
        />
      </ul>
    </article>
  );
}

function Pill({
  label,
  value,
  tone,
  hint
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "bark";
  hint: string;
}) {
  const tones = {
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200",
    rose: "text-rose-700 bg-rose-50 border-rose-200",
    bark: "text-bark-700 bg-cream-50 border-bark-100"
  };
  return (
    <li
      className={`rounded-xl border px-2 py-2.5 text-xs ${tones[tone]}`}
      title={hint}
    >
      <p className="font-semibold uppercase tracking-widest text-[10px] opacity-70">
        {label}
      </p>
      <p className="mt-0.5 font-display text-lg font-bold tabular-nums">
        {formatNumber(value)}
      </p>
    </li>
  );
}
