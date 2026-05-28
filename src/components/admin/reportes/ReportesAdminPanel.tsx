"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { ReportesCharts } from "@/components/admin/reportes/ReportesCharts";
import { ReportesKpiCards } from "@/components/admin/reportes/ReportesKpiCards";
import { ReportesRankings } from "@/components/admin/reportes/ReportesRankings";
import type { ReportesCompletos } from "@/lib/huellitas/reportesService";
import {
  RANGOS_REPORTE,
  type RangoReporte
} from "@/lib/huellitas/reportesRango";
import { cn } from "@/lib/utils";

export function ReportesAdminPanel() {
  const [rango, setRango] = useState<RangoReporte>("mes");
  const [data, setData] = useState<ReportesCompletos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (r: RangoReporte) => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reportes?rango=${r}`, {
        credentials: "same-origin"
      });
      const json = (await res.json()) as ReportesCompletos & {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || json.ok === false) {
        setError(json.error ?? "No se pudieron cargar los reportes.");
        setData(null);
        return;
      }
      setData({
        ventana: json.ventana,
        kpis: json.kpis,
        ventasSerie: json.ventasSerie,
        nivelesDistribucion: json.nivelesDistribucion,
        topClientes: json.topClientes,
        topPremios: json.topPremios
      });
    } catch {
      setError("Error de conexión al cargar reportes.");
      setData(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(rango);
  }, [rango, cargar]);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800 ring-1 ring-emerald-200">
            <BarChart3 size={12} />
            Analítica
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold text-bark-700 sm:text-3xl">
            Reportes y métricas
          </h1>
          <p className="mt-1 max-w-xl text-sm text-bark-600">
            Ventas, comunidad y rendimiento del programa de puntos.
          </p>
        </div>

        <div
          className="inline-flex rounded-2xl bg-white p-1 ring-1 ring-bark-100"
          role="group"
          aria-label="Rango temporal"
        >
          {RANGOS_REPORTE.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRango(opt.id)}
              disabled={cargando && rango === opt.id}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold transition",
                rango === opt.id
                  ? "bg-[#fb8500] text-white shadow-sm"
                  : "text-bark-600 hover:bg-orange-50"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {data?.ventana ? (
        <p className="text-xs text-bark-500 print:hidden">
          Período:{" "}
          <strong className="text-bark-700">{data.ventana.etiqueta}</strong>
          {" · "}solo lectura
        </p>
      ) : null}

      {error ? (
        <p
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {cargando && !data ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#fb8500]" size={32} />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <ReportesKpiCards kpis={data.kpis} />
          <ReportesCharts
            ventasSerie={data.ventasSerie}
            nivelesDistribucion={data.nivelesDistribucion}
          />
          <ReportesRankings
            topClientes={data.topClientes}
            topPremios={data.topPremios}
          />
        </div>
      ) : null}
    </section>
  );
}
