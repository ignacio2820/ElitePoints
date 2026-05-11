import { Award, Compass, Crown } from "lucide-react";
import type { NivelLealtad } from "@/lib/huellitas/types";
import { cn } from "@/lib/utils";

const tema = {
  cachorro: {
    bg: "bg-cachorro-50",
    text: "text-cachorro-600",
    ring: "ring-cachorro-100",
    icon: Award
  },
  explorador: {
    bg: "bg-explorador-50",
    text: "text-explorador-600",
    ring: "ring-explorador-100",
    icon: Compass
  },
  guardian: {
    bg: "bg-guardian-50",
    text: "text-guardian-600",
    ring: "ring-guardian-100",
    icon: Crown
  }
} as const;

export interface NivelBadgeProps {
  nivel: NivelLealtad;
  size?: "sm" | "md" | "lg";
  showMultiplier?: boolean;
  className?: string;
}

export function NivelBadge({
  nivel,
  size = "md",
  showMultiplier = false,
  className
}: NivelBadgeProps) {
  const t = tema[nivel.tema];
  const Icon = t.icon;
  const sizes = {
    sm: { root: "px-2.5 py-1 text-xs gap-1.5", icon: 12 },
    md: { root: "px-3 py-1.5 text-sm gap-2", icon: 14 },
    lg: { root: "px-4 py-2 text-base gap-2", icon: 18 }
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold ring-1",
        t.bg,
        t.text,
        t.ring,
        sizes[size].root,
        className
      )}
    >
      <Icon size={sizes[size].icon} />
      {nivel.nombre}
      {showMultiplier && nivel.multiplicador !== 1 ? (
        <span className="opacity-70">· {nivel.multiplicador}×</span>
      ) : null}
    </span>
  );
}
