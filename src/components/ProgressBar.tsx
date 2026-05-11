import { cn } from "@/lib/utils";
import type { NivelLealtad } from "@/lib/huellitas/types";

const trackByTema = {
  cachorro: "from-cachorro-400 to-cachorro-600",
  explorador: "from-explorador-400 to-explorador-600",
  guardian: "from-guardian-400 to-guardian-600"
} as const;

export interface ProgressBarProps {
  /** Valor 0..1 (clamp interno). */
  value: number;
  tema?: NivelLealtad["tema"];
  size?: "sm" | "md";
  className?: string;
  /** Mostrar marcador animado en la punta. */
  glow?: boolean;
}

/**
 * Barra de progreso elegante. Coherente con la estética "Cadena Web Elite":
 * track translúcido, fill con gradiente del nivel actual, esquinas redondeadas
 * generosas, transición suave.
 */
export function ProgressBar({
  value,
  tema = "cachorro",
  size = "md",
  className,
  glow = true
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const heights = { sm: "h-1.5", md: "h-2.5" } as const;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-bark-100/60",
        heights[size],
        className
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out",
          trackByTema[tema]
        )}
        style={{ width: `${pct}%` }}
      />
      {glow && pct > 0 && pct < 100 ? (
        <span
          className={cn(
            "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.35)] ring-1 ring-bark-200 transition-[left] duration-700 ease-out",
            size === "sm" && "h-2 w-2"
          )}
          style={{ left: `calc(${pct}% - 6px)` }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

/**
 * Stepper visual: muestra los niveles como puntos equidistantes
 * sobre una línea, indicando los alcanzados.
 */
export function ProgressStepper({
  niveles,
  acumulado,
  className
}: {
  niveles: NivelLealtad[];
  acumulado: number;
  className?: string;
}) {
  const ord = [...niveles].sort(
    (a, b) => a.umbralHistorico - b.umbralHistorico
  );
  const dotColor = (t: NivelLealtad["tema"]) =>
    t === "cachorro"
      ? "bg-cachorro-400"
      : t === "explorador"
      ? "bg-explorador-400"
      : "bg-guardian-400";

  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-3 right-3 top-1.5 h-0.5 rounded-full bg-bark-100" />
      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${ord.length}, 1fr)` }}>
        {ord.map((n) => {
          const reached = acumulado >= n.umbralHistorico;
          return (
            <div key={n.id} className="flex flex-col items-center">
              <div
                className={cn(
                  "h-3.5 w-3.5 rounded-full ring-4 ring-cream-50 transition",
                  reached ? dotColor(n.tema) : "bg-bark-100"
                )}
                aria-hidden
              />
              <div
                className={cn(
                  "mt-2 text-[10px] font-semibold uppercase tracking-wider",
                  reached ? "text-bark-700" : "text-bark-400"
                )}
              >
                {n.nombre}
              </div>
              <div className="text-[10px] text-bark-400">
                {n.umbralHistorico === 0
                  ? "Inicio"
                  : `${n.umbralHistorico.toLocaleString("es-AR")} 🐾`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
