import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo-elitepoints.jpg";

/** Naranja corporativo (alineado al CTA de la landing). */
const BRAND_ORANGE = "#f17105";

export interface ElitePointsLogoProps {
  /** `lockup` = isotipo circular + wordmark ElitePoints. `icon` = solo imagen. */
  variant?: "icon" | "lockup";
  /** Tamaño del isotipo en px. */
  size?: number;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  /** En lockup: colores del texto sobre fondo oscuro o claro. */
  tone?: "onDark" | "onLight";
  href?: string;
}

function ElitePointsWordmark({
  tone = "onDark",
  className
}: {
  tone?: "onDark" | "onLight";
  className?: string;
}) {
  return (
    <span
      className={cn("text-xl font-extrabold tracking-tight", className)}
    >
      <span className={tone === "onDark" ? "text-white" : "text-bark-700"}>
        Elite
      </span>
      <span style={{ color: BRAND_ORANGE }}>Points</span>
    </span>
  );
}

/**
 * Marca ElitePoints: isotipo oficial + wordmark opcional.
 */
export function ElitePointsLogo({
  variant = "icon",
  size = 40,
  className,
  imageClassName,
  priority = false,
  tone = "onDark",
  href
}: ElitePointsLogoProps) {
  const image = (
    <Image
      src={LOGO_SRC}
      alt="ElitePoints Logo"
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-full object-cover", imageClassName)}
    />
  );

  const content =
    variant === "lockup" ? (
      <span className={cn("flex items-center gap-3", className)}>
        {image}
        <ElitePointsWordmark tone={tone} />
      </span>
    ) : (
      <span className={cn("inline-flex shrink-0 items-center", className)}>
        {image}
      </span>
    );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}

export { ElitePointsWordmark, BRAND_ORANGE };
