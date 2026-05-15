import { CONTACT_EMAIL, mailtoContact } from "@/lib/contact";
import { cn } from "@/lib/utils";

export interface MascotPointsFooterProps {
  className?: string;
  variant?: "dashboard" | "poster";
  creditLabel?: string;
}

export function MascotPointsBrand({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-semibold tracking-tight", className)}>
      <span className="text-[#5C3D1E]">Mascot</span>
      <span className="text-[#C9A227]">Points</span>
    </span>
  );
}

export function MascotPointsFooter({
  className,
  variant = "dashboard",
  creditLabel = "Desarrollado por"
}: MascotPointsFooterProps) {
  const isPoster = variant === "poster";

  return (
    <footer
      className={cn(
        "text-center",
        isPoster
          ? "mt-8 border-t border-[#E8DCC8] pt-5 text-[11px] leading-relaxed tracking-[0.12em] text-[#6B5848]"
          : "border-t border-bark-100/80 px-6 py-5 text-xs text-bark-500",
        className
      )}
    >
      <p>
        {creditLabel} <MascotPointsBrand /> · Agencia WebElite SOLUTIONS
      </p>
      <p className="mt-1">
        <a
          href={mailtoContact()}
          className="font-medium text-bark-600 underline-offset-2 hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
      </p>
    </footer>
  );
}
