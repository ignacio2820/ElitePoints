import { HuellitaIcon } from "@/components/HuellitaIcon";
import { cn } from "@/lib/utils";

export interface LocalBrandMarkProps {
  nombreLocal: string;
  logoUrl?: string | null;
  /** 40 = w-10 h-10 en Tailwind por defecto (1rem=16px). */
  size?: number;
  /** Círculo perfecto (p. ej. navbar admin); por defecto es esquinas suaves (rounded-xl). */
  shape?: "soft" | "circle";
  className?: string;
  iconClassName?: string;
  imageClassName?: string;
}

export function LocalBrandMark({
  nombreLocal,
  logoUrl,
  size = 32,
  shape = "soft",
  className,
  iconClassName,
  imageClassName
}: LocalBrandMarkProps) {
  const logo = logoUrl?.trim();
  const radius =
    shape === "circle" ? "rounded-full" : "rounded-xl";

  if (logo) {
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
    <HuellitaIcon
      size={size}
      className={cn("shrink-0 text-bark-400", iconClassName)}
    />
  );
}
