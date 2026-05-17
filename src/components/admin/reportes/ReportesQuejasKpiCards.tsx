"use client";

import { AlertTriangle, Clock, Percent } from "lucide-react";
import type { ReportesQuejasKpis } from "@/lib/huellitas/reportesQuejasService";

function formatearTiempoRespuesta(horas: number | null): string {
  if (horas === null) return "—";
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  if (horas < 48) return `${horas.toFixed(1)} h`;
  return `${(horas / 24).toFixed(1)} d`;
}

type Props = {
  kpis: ReportesQuejasKpis;
};

export function ReportesQuejasKpiCards({ kpis }: Props) {
  const cards = [
    {
      label: "Tiempo promedio de respuesta",
      value: formatearTiempoRespuesta(kpis.tiempoPromedioRespuestaHoras),
      hint: "Desde la alerta hasta marcar como resuelta",
      icon: Clock,
      ring: "ring-emerald-100",
      iconBg: "bg-emerald-50 text-emerald-700"
    },
    {
      label: "Tasa de resolución",
      value: `${kpis.tasaResolucionPct.toFixed(1)}%`,
      hint: "Quejas resueltas sobre negativas del período",
      icon: Percent,
      ring: "ring-[#fb8500]/25",
      iconBg: "bg-orange-50 text-[#e67700]"
    },
    {
      label: "Alertas activas pendientes",
      value: String(kpis.alertasPendientes),
      hint: "Estado pendiente sin disculpa enviada",
      icon: AlertTriangle,
      ring: "ring-red-100",
      iconBg: "bg-red-50 text-red-700"
    }
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <article
          key={c.label}
          className={`surface-card overflow-hidden rounded-2xl p-5 ring-1 ${c.ring}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-bark-500">
              {c.label}
            </p>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${c.iconBg}`}
            >
              <c.icon size={18} />
            </span>
          </div>
          <p className="mt-3 font-display text-2xl font-bold tabular-nums text-emerald-900 sm:text-3xl">
            {c.value}
          </p>
          <p className="mt-1 text-xs text-bark-500">{c.hint}</p>
        </article>
      ))}
    </div>
  );
}
