"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type {
  PuntoQuejasMensual,
  SegmentoCategoriaQueja
} from "@/lib/huellitas/reportesQuejasService";
import { formatNumber } from "@/lib/utils";

type Props = {
  serieMensual: PuntoQuejasMensual[];
  categorias: SegmentoCategoriaQueja[];
};

const TOOLTIP_LIGHT = {
  backgroundColor: "#ffffff",
  border: "1px solid rgba(27, 67, 50, 0.12)",
  borderRadius: "12px",
  color: "#1B4332",
  fontSize: "12px",
  boxShadow: "0 8px 24px -8px rgba(27,67,50,0.15)"
};

export function ReportesQuejasCharts({ serieMensual, categorias }: Props) {
  const vacioSerie = serieMensual.every(
    (p) => p.recibidas === 0 && p.resueltas === 0
  );
  const donutData = categorias.filter((c) => c.cantidad > 0);

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <article className="surface-card overflow-hidden rounded-3xl p-5 ring-1 ring-bark-100 lg:col-span-3 lg:p-6">
        <header className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#fb8500]">
            Comparativo
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-emerald-900">
            Quejas recibidas vs resueltas
          </h3>
          <p className="mt-1 text-xs text-bark-500">
            Barras naranjas: alertas nuevas. Barras verdes: resoluciones en el período.
          </p>
        </header>
        {vacioSerie ? (
          <p className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-bark-200 text-sm text-bark-400">
            Sin quejas negativas en este período.
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={serieMensual}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#52796F", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#52796F", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip contentStyle={TOOLTIP_LIGHT} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", color: "#52796F" }}
                  formatter={(value) =>
                    value === "recibidas" ? "Recibidas" : "Resueltas"
                  }
                />
                <Bar
                  dataKey="recibidas"
                  name="recibidas"
                  fill="#E67700"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  dataKey="resueltas"
                  name="resueltas"
                  fill="#2D6A4F"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>

      <article className="surface-card overflow-hidden rounded-3xl p-5 ring-1 ring-bark-100 lg:col-span-2 lg:p-6">
        <header className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">
            Clasificación
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-emerald-900">
            Motivos en comentarios
          </h3>
          <p className="mt-1 text-xs text-bark-500">
            Detección por palabras clave: Atención, Tiempos, Calidad u Otros.
          </p>
        </header>
        {donutData.length === 0 ? (
          <p className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-bark-200 text-sm text-bark-400">
            Sin comentarios clasificables en el período.
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
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.categoriaId} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_LIGHT}
                    formatter={(value: number, _name, item) => {
                      const pct = (item.payload as SegmentoCategoriaQueja).porcentaje;
                      return [`${formatNumber(value)} (${pct.toFixed(1)}%)`, "Quejas"];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-4 space-y-2">
              {categorias.map((c) => (
                <li
                  key={c.categoriaId}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-2 text-bark-600">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="truncate">{c.nombre}</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-emerald-900">
                    {c.porcentaje.toFixed(0)}%
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
