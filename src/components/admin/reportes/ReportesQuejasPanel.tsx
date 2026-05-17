"use client";

import { useCallback, useEffect, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { ReportesQuejasCharts } from "@/components/admin/reportes/ReportesQuejasCharts";
import { ReportesQuejasKpiCards } from "@/components/admin/reportes/ReportesQuejasKpiCards";
import type { ReportesQuejasCompletos } from "@/lib/huellitas/reportesQuejasService";
import type { RangoReporte } from "@/lib/huellitas/reportesRango";

type Props = {
  rango: RangoReporte;
  cargandoRango: boolean;
};

export function ReportesQuejasPanel({ rango, cargandoRango }: Props) {
  const [data, setData] = useState<ReportesQuejasCompletos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (r: RangoReporte) => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reportes/quejas?rango=${r}`, {
        credentials: "same-origin",
        cache: "no-store"
      });
      const json = (await res.json()) as ReportesQuejasCompletos & {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || json.ok === false) {
        setError(json.error ?? "No se pudieron cargar las métricas de quejas.");
        setData(null);
        return;
      }
      setData({
        ventana: json.ventana,
        kpis: json.kpis,
        serieMensual: json.serieMensual,
        categorias: json.categorias
      });
    } catch {
      setError("Error de conexión al cargar el panel de quejas.");
      setData(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(rango);
  }, [rango, cargar]);

  function exportarReporte() {
    const prev = document.title;
    document.title = `Reporte de quejas — ${data?.ventana.etiqueta ?? "MascotPoints"}`;
    window.print();
    document.title = prev;
  }

  const ocupado = cargando || cargandoRango;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">
            Resolución de quejas
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-emerald-900">
            Cuadro de mando de satisfacción
          </h2>
          <p className="mt-1 max-w-xl text-sm text-bark-600">
            Métricas de alertas por encuestas negativas y recuperación de clientes.
          </p>
        </div>
        <button
          type="button"
          onClick={exportarReporte}
          disabled={!data || ocupado}
          className="btn-primary inline-flex shrink-0 items-center gap-2 shadow-md disabled:opacity-50"
        >
          <FileDown size={18} />
          Exportar reporte
        </button>
      </div>

      <div
        id="reporte-quejas-export"
        className="reporte-quejas-export space-y-6 rounded-3xl bg-cream-50/50 p-1 print:rounded-none print:bg-white print:p-0"
      >
        {data?.ventana ? (
          <p className="text-xs text-bark-500 print:text-black">
            Período:{" "}
            <strong className="text-bark-700 print:text-black">
              {data.ventana.etiqueta}
            </strong>
            <span className="hidden print:inline">
              {" · "}Generado el{" "}
              {new Intl.DateTimeFormat("es-AR", {
                dateStyle: "long",
                timeStyle: "short"
              }).format(new Date())}
            </span>
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

        {ocupado && !data ? (
          <div className="flex justify-center py-16 print:hidden">
            <Loader2 className="animate-spin text-emerald-700" size={32} />
          </div>
        ) : data ? (
          <>
            <ReportesQuejasKpiCards kpis={data.kpis} />
            <ReportesQuejasCharts
              serieMensual={data.serieMensual}
              categorias={data.categorias}
            />
            <footer className="hidden border-t border-bark-200 pt-4 text-center text-xs text-bark-600 print:block">
              MascotPoints · Reporte de resolución de quejas · Uso interno del local
            </footer>
          </>
        ) : null}
      </div>
    </section>
  );
}
