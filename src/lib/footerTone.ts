/**
 * Infiere si el pie de página está sobre fondo oscuro o claro
 * (props `variant` + clases Tailwind en `className`).
 */
const DARK_BG_PATTERN =
  /\b(?:bg-(?:bark-(?:700|800|900)|emerald-(?:700|800|900)|green-(?:700|800|900)|zinc-(?:800|900|950)|neutral-(?:800|900)|slate-(?:800|900)|gray-(?:800|900)|stone-(?:800|900)|black)(?:\/\d+)?)\b/;

export type FooterTone = "light" | "dark";

export type FooterVariant = "dashboard" | "poster" | "onDark";

export function inferFooterTone(
  variant: FooterVariant = "dashboard",
  className?: string
): FooterTone {
  if (variant === "onDark") return "dark";
  if (variant === "poster" || variant === "dashboard") {
    if (className && DARK_BG_PATTERN.test(className)) return "dark";
    return "light";
  }
  return "light";
}
