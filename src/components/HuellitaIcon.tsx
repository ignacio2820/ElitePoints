import { cn } from "@/lib/utils";

export interface HuellitaIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  filled?: boolean;
}

/**
 * Huellita estilizada: 1 almohadilla + 4 dedos. Vector limpio, escalable.
 * `filled` = sólida (saldo activo), no-filled = contorno (placeholder/inactivo).
 */
export function HuellitaIcon({
  size = 28,
  filled = true,
  className,
  ...props
}: HuellitaIconProps) {
  const fill = filled ? "currentColor" : "none";
  const stroke = "currentColor";
  const strokeWidth = filled ? 0 : 1.6;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("inline-block", className)}
      aria-hidden="true"
      {...props}
    >
      <ellipse cx="32" cy="42" rx="14" ry="12" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      <ellipse cx="14" cy="28" rx="6" ry="8" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      <ellipse cx="50" cy="28" rx="6" ry="8" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      <ellipse cx="22" cy="14" rx="5.5" ry="7" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      <ellipse cx="42" cy="14" rx="5.5" ry="7" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    </svg>
  );
}

/**
 * Pila visual de huellitas (hasta `max`). Útil para mostrar el saldo
 * de manera "gráfica" en hero del cliente. No es un gráfico de datos:
 * limita a `max` íconos y deja el número como cifra principal.
 */
export function HuellitasStack({
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
        <HuellitaIcon
          key={`f-${i}`}
          size={size}
          className="text-bark-400"
          style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 6}deg)` }}
        />
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <HuellitaIcon
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
