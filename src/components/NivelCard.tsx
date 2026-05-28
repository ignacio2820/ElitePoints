import { Check, Sparkles } from "lucide-react";
import { progresoNivel } from "@/lib/huellitas/engine";
import type { NivelLealtad } from "@/lib/huellitas/types";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { NivelBadge } from "@/components/NivelBadge";
import { ProgressBar, ProgressStepper } from "@/components/ProgressBar";
import { formatNumber } from "@/lib/utils";

export interface NivelCardProps {
  acumuladoHistorico: number;
  niveles: NivelLealtad[];
}

export function NivelCard({ acumuladoHistorico, niveles }: NivelCardProps) {
  const p = progresoNivel(acumuladoHistorico, niveles);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-bark-400">
              <Sparkles size={16} />
              <span className="label-elegant">Tu rango</span>
            </div>
            <CardTitle className="mt-2">
              Sos {p.nivelActual.nombre}
            </CardTitle>
            <CardDescription>
              Acumulaste{" "}
              <strong className="text-bark-700">
                {formatNumber(acumuladoHistorico)}
              </strong>{" "}
              puntos en total. Cuanto más comprás, mejores beneficios desbloqueás.
            </CardDescription>
          </div>
          <NivelBadge nivel={p.nivelActual} size="lg" showMultiplier />
        </div>
      </CardHeader>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-[color:var(--muted)]">
            {p.nivelSiguiente
              ? `Próximo nivel: ${p.nivelSiguiente.nombre}`
              : "Llegaste al rango más alto"}
          </span>
          <span className="font-semibold text-bark-700">
            {p.nivelSiguiente
              ? `Te faltan ${formatNumber(p.huellitasFaltantes)} puntos`
              : "¡Sos leyenda!"}
          </span>
        </div>
        <ProgressBar
          value={p.pctTramo}
          tema={p.nivelActual.tema}
          size="md"
        />
      </div>

      <div className="mt-6">
        <ProgressStepper niveles={niveles} acumulado={acumuladoHistorico} />
      </div>

      <div className="mt-6 rounded-2xl bg-cream-100 p-5">
        <div className="text-xs uppercase tracking-widest text-bark-400">
          Tus beneficios
        </div>
        <ul className="mt-3 space-y-2">
          {p.nivelActual.beneficios.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-bark-500"
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white">
                <Check size={12} className="text-sage-300" />
              </span>
              {b}
            </li>
          ))}
        </ul>

        {p.nivelSiguiente ? (
          <div className="mt-4 border-t border-bark-100 pt-4">
            <div className="text-xs uppercase tracking-widest text-bark-400">
              Te espera en {p.nivelSiguiente.nombre}
            </div>
            <ul className="mt-2 space-y-1.5">
              {p.nivelSiguiente.beneficios.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-[color:var(--muted)]"
                >
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-bark-200" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
