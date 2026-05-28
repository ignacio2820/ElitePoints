import { CONTACT_EMAIL, mailtoContact } from "@/lib/contact";
import { inferFooterTone, type FooterVariant } from "@/lib/footerTone";
import { cn } from "@/lib/utils";

export interface ElitePointsFooterProps {
  className?: string;
  variant?: FooterVariant;
  tone?: "light" | "dark";
  creditLabel?: string;
}

export function ElitePointsBrand({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-semibold tracking-tight", className)}>
      <span className="text-[#1B4332]">Elite</span>
      <span className="text-[#FB8500]">Points</span>
    </span>
  );
}

export function ElitePointsFooter({
  className,
  variant = "dashboard",
  tone,
  creditLabel = "Desarrollado por"
}: ElitePointsFooterProps) {
  const isPoster = variant === "poster";
  const resolvedTone = tone ?? inferFooterTone(variant, className);
  const onDark = resolvedTone === "dark";

  return (
    <footer
      className={cn(
        "text-center",
        isPoster
          ? "mt-8 border-t border-[#E8DCC8] pt-5 text-[11px] leading-relaxed tracking-[0.12em] text-[#6B5848]"
          : onDark
            ? "border-t border-white/15 px-6 py-5 text-xs text-zinc-100"
            : "border-t border-bark-100/80 px-6 py-5 text-xs text-zinc-800",
        className
      )}
    >
      <p className={onDark && !isPoster ? "text-zinc-100" : undefined}>
        {creditLabel}{" "}
        <ElitePointsBrand /> ·{" "}
        <span
          className={
            isPoster
              ? undefined
              : onDark
                ? "text-zinc-200"
                : "text-zinc-700"
          }
        >
          Agencia WebElite SOLUTIONS
        </span>
      </p>
      <p className="mt-1">
        <a
          href={mailtoContact()}
          className={cn(
            "font-medium underline-offset-2 hover:underline",
            isPoster
              ? "text-[#5C4A3A] hover:text-[#3D2E22]"
              : onDark
                ? "text-zinc-200 hover:text-white"
                : "text-zinc-700 hover:text-zinc-900"
          )}
        >
          {CONTACT_EMAIL}
        </a>
      </p>
    </footer>
  );
}

/** @deprecated Usar `ElitePointsFooter` / `ElitePointsBrand`. */
export const MascotPointsFooter = ElitePointsFooter;
export const MascotPointsBrand = ElitePointsBrand;
