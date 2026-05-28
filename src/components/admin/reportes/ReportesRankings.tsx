"use client";

import Link from "next/link";
import { Award, Gift } from "lucide-react";
import type {
  TopClienteReporte,
  TopPremioReporte
} from "@/lib/huellitas/reportesService";
import { PuntoIcon } from "@/components/PuntoIcon";
import { formatNumber } from "@/lib/utils";

type Props = {
  topClientes: TopClienteReporte[];
  topPremios: TopPremioReporte[];
};

export function ReportesRankings({ topClientes, topPremios }: Props) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <article className="overflow-hidden rounded-3xl bg-gradient-to-br from-bark-800 via-bark-800 to-bark-900 p-5 ring-1 ring-white/10 lg:p-6">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/90">
              Ranking
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-cream-50">
              Top 5 clientes
            </h3>
            <p className="mt-1 text-xs text-cream-100/60">
              Mayor puntos históricas — tus clientes más fieles.
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
            <Award size={18} />
          </span>
        </header>
        {topClientes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-cream-100/50">
            Todavía no hay clientes con acumulado histórico.
          </p>
        ) : (
          <ol className="space-y-2">
            {topClientes.map((c, i) => (
              <li
                key={c.clienteId}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 transition hover:bg-white/[0.08]"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-display text-xs font-bold ${
                    i === 0
                      ? "bg-gradient-to-br from-amber-400 to-terracotta-500 text-white"
                      : "bg-white/10 text-cream-100"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/scan/${encodeURIComponent(c.clienteId)}`}
                    className="truncate font-semibold text-cream-50 hover:text-amber-200"
                  >
                    {c.nombre}
                  </Link>
                  <p className="text-[11px] text-cream-100/55">{c.nivelNombre}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 tabular-nums text-sm font-bold text-amber-200">
                  <PuntoIcon size={12} />
                  {formatNumber(c.huellitasHistoricas)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </article>

      <article className="overflow-hidden rounded-3xl bg-gradient-to-br from-bark-800 via-bark-800 to-bark-900 p-5 ring-1 ring-white/10 lg:p-6">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/90">
              Catálogo
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-cream-50">
              Top 5 premios canjeados
            </h3>
            <p className="mt-1 text-xs text-cream-100/60">
              Premios más solicitados en el período seleccionado.
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-terracotta-500/15 text-terracotta-300">
            <Gift size={18} />
          </span>
        </header>
        {topPremios.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-cream-100/50">
            Sin canjes confirmados en este período.
          </p>
        ) : (
          <ol className="space-y-2">
            {topPremios.map((p, i) => (
              <li
                key={p.premioId}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 font-display text-xs font-bold text-cream-100">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-cream-50">{p.nombre}</p>
                  <p className="text-[11px] text-cream-100/55">
                    {p.cantidad} canje{p.cantidad === 1 ? "" : "s"} ·{" "}
                    {formatNumber(p.huellitasTotales)} puntos
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </article>
    </div>
  );
}
