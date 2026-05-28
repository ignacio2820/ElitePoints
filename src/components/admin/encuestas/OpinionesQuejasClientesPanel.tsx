"use client";

import { useState } from "react";
import { MessageSquare, MessageSquareWarning } from "lucide-react";
import { FeedbackEncuestasPanel } from "@/components/admin/encuestas/FeedbackEncuestasPanel";
import { ReportesQuejasPanel } from "@/components/admin/reportes/ReportesQuejasPanel";
import {
  RANGOS_REPORTE,
  type RangoReporte
} from "@/lib/huellitas/reportesRango";
import { cn } from "@/lib/utils";

type SubVista = "opiniones" | "metricas";

export function OpinionesQuejasClientesPanel() {
  const [subVista, setSubVista] = useState<SubVista>("opiniones");
  const [rango, setRango] = useState<RangoReporte>("mes");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-bark-100"
          role="tablist"
          aria-label="Opiniones y métricas"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subVista === "opiniones"}
            onClick={() => setSubVista("opiniones")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition",
              subVista === "opiniones"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-bark-600 hover:bg-cream-50"
            )}
          >
            <MessageSquare size={14} />
            Opiniones de clientes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subVista === "metricas"}
            onClick={() => setSubVista("metricas")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition",
              subVista === "metricas"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-bark-600 hover:bg-cream-50"
            )}
          >
            <MessageSquareWarning size={14} />
            Métricas y resolución
          </button>
        </div>

        {subVista === "metricas" ? (
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
        ) : null}
      </div>

      {subVista === "opiniones" ? (
        <FeedbackEncuestasPanel
          descripcion="Encuestas completadas tras compras con puntos. Las valoraciones muy bajas generan una alerta en la pestaña Alertas, donde podés enviar una disculpa."
        />
      ) : (
        <ReportesQuejasPanel rango={rango} cargandoRango={false} />
      )}
    </div>
  );
}
