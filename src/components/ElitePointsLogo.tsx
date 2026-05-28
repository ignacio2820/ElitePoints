import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo-elitepoints.jpg";

export interface ElitePointsLogoProps {
  /** Alto máximo en px (ancho proporcional). */
  height?: number;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

/**
 * Logo oficial ElitePoints para navbar, landing y pie de página.
 */
export function ElitePointsLogo({
  height = 36,
  className,
  imageClassName,
  priority = false
}: ElitePointsLogoProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        src={LOGO_SRC}
        alt="ElitePoints"
        width={height}
        height={height}
        priority={priority}
        className={cn("h-auto w-auto object-contain object-left", imageClassName)}
        style={{ maxHeight: height, maxWidth: height * 2.5 }}
      />
    </span>
  );
}
