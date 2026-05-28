import { Award } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PuntoIconProps {
  size?: number;
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * Icono de puntos ElitePoints (medalla premium de lucide-react).
 * `filled` = sólido; sin relleno = trazo más suave para estados vacíos.
 */
export function PuntoIcon({
  size = 28,
  filled = true,
  className,
  style,
  ...props
}: PuntoIconProps) {
  return (
    <Award
      width={size}
      height={size}
      strokeWidth={filled ? 2.2 : 1.6}
      className={cn(
        "inline-block shrink-0",
        filled ? "fill-current" : "fill-none",
        className
      )}
      style={style}
      aria-hidden={props["aria-hidden"] ?? true}
    />
  );
}

/** Pila decorativa de iconos de puntos (hasta `max`). */
export function PuntosStack({
  count,
  max = 6,
  size = 22,
  className
}: {
  count: number;
  max?: number;
  size?: number;
  className?: string;
}) {
  const filled = Math.min(count, max);
  const empty = Math.max(0, max - filled);
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {Array.from({ length: filled }).map((_, i) => (
        <PuntoIcon
          key={`f-${i}`}
          size={size}
          className="text-bark-400"
          style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 6}deg)` }}
        />
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <PuntoIcon
          key={`e-${i}`}
          size={size}
          filled={false}
          className="text-bark-200"
          style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 6}deg)` }}
        />
      ))}
    </div>
  );
}
