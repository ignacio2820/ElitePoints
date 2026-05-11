import { HuellitaIcon } from "@/components/HuellitaIcon";
import { cn } from "@/lib/utils";

export interface LocalBrandMarkProps {
  nombreLocal: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
  iconClassName?: string;
  imageClassName?: string;
}

export function LocalBrandMark({
  nombreLocal,
  logoUrl,
  size = 32,
  className,
  iconClassName,
  imageClassName
}: LocalBrandMarkProps) {
  const logo = logoUrl?.trim();

  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={`Logo de ${nombreLocal}`}
        width={size}
        height={size}
        className={cn(
          "shrink-0 rounded-xl border border-bark-100 bg-white object-cover",
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
