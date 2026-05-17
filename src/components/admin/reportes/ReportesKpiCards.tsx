"use client";

import { DollarSign, Percent, TrendingUp, Users } from "lucide-react";
import type { ReportesKpis } from "@/lib/huellitas/reportesService";
import { formatARS, formatNumber } from "@/lib/utils";

type Props = {
  kpis: ReportesKpis;
};

export function ReportesKpiCards({ kpis }: Props) {
  const crecimiento =
    kpis.crecimientoComunidadPct === null
      ? "—"
      : `${kpis.crecimientoComunidadPct > 0 ? "+" : ""}${kpis.crecimientoComunidadPct.toFixed(1)}%`;

  const cards = [
    {
      label: "Ventas fidelizadas",
      value: formatARS(kpis.ventasTotalesFidelizadas),
      hint: "Monto $ con huellitas emitidas",
      icon: DollarSign,
      accent: "from-amber-500/20 to-terracotta-500/10 text-amber-200"
    },
    {
      label: "Clientes activos",
      value: formatNumber(kpis.clientesActivos),
      hint: "Con ventas fidelizadas en el período",
      icon: Users,
      accent: "from-emerald-500/15 to-emerald-600/5 text-emerald-200"
    },
    {
      label: "Tasa de canje",
      value: `${kpis.tasaCanjeBurnRate.toFixed(1)}%`,
      hint: "Burn rate histórico (canjeadas / emitidas)",
      icon: Percent,
      accent: "from-bark-500/30 to-bark-600/10 text-cream-100"
    },
    {
      label: "Crecimiento comunidad",
      value: crecimiento,
      hint: "Nuevos clientes vs período anterior",
      icon: TrendingUp,
      accent: "from-terracotta-500/20 to-amber-500/10 text-terracotta-200"
    }
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <article
          key={c.label}
          className="overflow-hidden rounded-2xl bg-gradient-to-br from-bark-800 to-bark-900 p-5 ring-1 ring-white/10"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cream-100/50">
              {c.label}
            </p>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.accent}`}
            >
              <c.icon size={18} />
            </span>
          </div>
          <p className="mt-3 font-display text-2xl font-bold tabular-nums text-cream-50 sm:text-3xl">
            {c.value}
          </p>
          <p className="mt-1 text-xs text-cream-100/55">{c.hint}</p>
        </article>
      ))}
    </div>
  );
}
