"use client";

import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { PuntoVentaSerie, SegmentoNivel } from "@/lib/huellitas/reportesService";
import { formatARS, formatNumber } from "@/lib/utils";

type Props = {
  ventasSerie: PuntoVentaSerie[];
  nivelesDistribucion: SegmentoNivel[];
};

const TOOLTIP_STYLE = {
  backgroundColor: "#2d2118",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "12px",
  color: "#f5ebe0",
  fontSize: "12px"
};

export function ReportesCharts({ ventasSerie, nivelesDistribucion }: Props) {
  const donutData = nivelesDistribucion.filter((n) => n.cantidad > 0);
  const vacioVentas = ventasSerie.every((p) => p.monto === 0);

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <article className="overflow-hidden rounded-3xl bg-gradient-to-br from-bark-800 via-bark-800 to-bark-900 p-5 ring-1 ring-white/10 lg:col-span-3 lg:p-6">
        <header className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/90">
            Tendencia
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-cream-50">
            Ventas fidelizadas
          </h3>
          <p className="mt-1 text-xs text-cream-100/60">
            Monto en pesos de ventas que generaron puntos en el período.
          </p>
        </header>
        {vacioVentas ? (
          <p className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-cream-100/50">
            Sin ventas fidelizadas en este período.
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ventasSerie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ventasArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E07A5F" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#E07A5F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "rgba(245,235,224,0.55)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "rgba(245,235,224,0.45)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                  }
                  width={42}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number) => [formatARS(value), "Monto"]}
                  labelFormatter={(label) => String(label)}
                />
                <Area
                  type="monotone"
                  dataKey="monto"
                  stroke="#E07A5F"
                  strokeWidth={2.5}
                  fill="url(#ventasArea)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#FBF8F3", stroke: "#E07A5F", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>

      <article className="overflow-hidden rounded-3xl bg-gradient-to-br from-bark-800 via-bark-800 to-bark-900 p-5 ring-1 ring-white/10 lg:col-span-2 lg:p-6">
        <header className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/90">
            Comunidad
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-cream-50">
            Niveles de lealtad
          </h3>
          <p className="mt-1 text-xs text-cream-100/60">
            Segmentación por puntos históricas actuales.
          </p>
        </header>
        {donutData.length === 0 ? (
          <p className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-cream-100/50">
            Aún no hay clientes con puntos históricas.
          </p>
        ) : (
          <>
            <div className="mx-auto h-44 w-full max-w-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="cantidad"
                    nameKey="nombre"
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="88%"
                    paddingAngle={3}
                    stroke="rgba(45,33,24,0.8)"
                    strokeWidth={2}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.nivelId} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number, _name, item) => {
                      const pct = (item.payload as SegmentoNivel).porcentaje;
                      return [`${formatNumber(value)} (${pct.toFixed(1)}%)`, "Clientes"];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-4 space-y-2">
              {nivelesDistribucion.map((n) => (
                <li
                  key={n.nivelId}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-2 text-cream-100/80">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: n.color }}
                    />
                    <span className="truncate">{n.nombre}</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-cream-50">
                    {n.porcentaje.toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </article>
    </div>
  );
}
