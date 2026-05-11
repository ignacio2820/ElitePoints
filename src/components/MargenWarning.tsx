"use client";

import { AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";
import { diagnosticarPrograma } from "@/lib/huellitas/engine";
import type { ConfiguracionLocal } from "@/lib/huellitas/types";
import { formatARS, formatPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

/**
 * Advertencia visual que explica la diferencia entre Costo de Acumulación
 * y Valor de Canje, ayudando al dueño a proteger su margen.
 */
export function MargenWarning({
  cfg
}: {
  cfg: Pick<
    ConfiguracionLocal,
    "montoParaUnaHuellita" | "valorMonetarioHuellita"
  >;
}) {
  const { costoEfectivoPct, salud, mensaje } = diagnosticarPrograma(cfg);

  const tone = salud === "saludable" ? "saludable" : salud === "ajustado" ? "ajustado" : "peligroso";
  const Icon = salud === "saludable" ? ShieldCheck : salud === "ajustado" ? TrendingUp : AlertTriangle;

  const ringColor =
    salud === "saludable"
      ? "ring-sage-200 bg-sage-50"
      : salud === "ajustado"
      ? "ring-cream-200 bg-cream-50"
      : "ring-terracotta-200 bg-terracotta-50";

  // Ejemplo concreto de un ticket de $10.000
  const ticketEjemplo = 10_000;
  const huellitasEjemplo = Math.floor(ticketEjemplo / cfg.montoParaUnaHuellita);
  const descuentoEjemplo = huellitasEjemplo * cfg.valorMonetarioHuellita;

  return (
    <div className={`rounded-2xl ${ringColor} ring-1 p-6`}>
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 ring-1 ring-bark-100">
          <Icon
            size={20}
            className={
              salud === "saludable"
                ? "text-sage-300"
                : salud === "ajustado"
                ? "text-bark-500"
                : "text-terracotta-400"
            }
          />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="font-display text-lg font-semibold text-bark-700">
              Salud de tu programa
            </h4>
            <Badge tone={tone}>
              {salud === "saludable"
                ? "Saludable"
                : salud === "ajustado"
                ? "Ajustado"
                : "Peligroso"}
              {" · "}
              {formatPercent(costoEfectivoPct, 2)} del ticket
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-bark-500">{mensaje}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/70 p-4 ring-1 ring-bark-100">
              <div className="text-[11px] uppercase tracking-widest text-bark-400">
                Costo de Acumulación
              </div>
              <div className="mt-1 font-display text-xl font-semibold text-bark-700">
                {formatARS(cfg.montoParaUnaHuellita)}
              </div>
              <div className="text-xs text-[color:var(--muted)]">
                el cliente debe gastar esto para sumar 1 huellita
              </div>
            </div>
            <div className="rounded-xl bg-white/70 p-4 ring-1 ring-bark-100">
              <div className="text-[11px] uppercase tracking-widest text-bark-400">
                Valor de Canje
              </div>
              <div className="mt-1 font-display text-xl font-semibold text-bark-700">
                {formatARS(cfg.valorMonetarioHuellita)}
              </div>
              <div className="text-xs text-[color:var(--muted)]">
                lo que descontás por cada huellita canjeada
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-bark-200 bg-white/50 p-4 text-sm text-bark-500">
            <strong className="text-bark-700">Ejemplo:</strong> en un ticket de{" "}
            <strong>{formatARS(ticketEjemplo)}</strong> el cliente suma{" "}
            <strong>{huellitasEjemplo} huellitas</strong>. Cuando las canjee, le
            estarás descontando{" "}
            <strong>{formatARS(descuentoEjemplo)}</strong> ({formatPercent(costoEfectivoPct, 2)}{" "}
            del ticket). Asegurate de que tu margen lo soporte.
          </div>
        </div>
      </div>
    </div>
  );
}
