import { ElitePointsLogo } from "@/components/ElitePointsLogo";
import { cn } from "@/lib/utils";

export interface LocalBrandMarkProps {
  nombreLocal: string;
  logoUrl?: string | null;
  /** Tamaño del ícono fallback o del lado máximo en modo avatar cuadrado. */
  size?: number;
  /** Cuadrado fijo (navbar). `natural` respeta proporciones del logo (object-contain). */
  fit?: "cover" | "contain";
  maxWidth?: number;
  maxHeight?: number;
  /** @deprecated Usar fit="contain" */
  shape?: "soft" | "circle";
  className?: string;
  iconClassName?: string;
  imageClassName?: string;
}

export function LocalBrandMark({
  nombreLocal,
  logoUrl,
  size = 32,
  fit,
  maxWidth = 200,
  maxHeight = 120,
  shape = "soft",
  className,
  iconClassName,
  imageClassName
}: LocalBrandMarkProps) {
  const logo = logoUrl?.trim();
  const usarContain = fit === "contain";
  const radius =
    shape === "circle" && !usarContain ? "rounded-full" : "rounded-xl";

  if (logo) {
    if (usarContain) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={`Logo de ${nombreLocal}`}
          className={cn(
            "h-auto w-auto max-w-full object-contain object-center",
            imageClassName,
            className
          )}
          style={{
            maxWidth: Math.min(maxWidth, 200),
            maxHeight
          }}
        />
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={`Logo de ${nombreLocal}`}
        width={size}
        height={size}
        className={cn(
          "shrink-0 border border-bark-100 bg-white object-cover",
          radius,
          imageClassName
        )}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <ElitePointsLogo
      variant="icon"
      size={size}
      className={cn(className)}
      imageClassName={cn(iconClassName, imageClassName)}
    />
  );
}
