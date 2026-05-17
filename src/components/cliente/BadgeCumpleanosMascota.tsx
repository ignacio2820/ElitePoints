"use client";

import { Cake, Gift } from "lucide-react";
import { esCumpleanos, esMesCumpleanos } from "@/lib/huellitas/engine";
import type { Mascota } from "@/lib/huellitas/types";

type Props = {
  mascota: Pick<Mascota, "fechaNacimiento" | "nombre">;
  className?: string;
};

/**
 * Decoración visual en el portal cliente (sin llamadas al servidor).
 */
export function BadgeCumpleanosMascota({ mascota, className = "" }: Props) {
  const hoy = esCumpleanos(mascota);
  const mes = esMesCumpleanos(mascota);

  if (!mes) return null;

  if (hoy) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-200/90 to-amber-400/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm ring-1 ring-amber-300/60 ${className}`}
        title={`¡${mascota.nombre} cumple años hoy!`}
      >
        <Cake size={12} className="shrink-0" aria-hidden />
        ¡Hoy!
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-100/80 to-amber-300/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900/90 ring-1 ring-amber-200/80 ${className}`}
      title={`Mes de cumpleaños de ${mascota.nombre}`}
    >
      <Gift size={11} className="shrink-0 text-amber-700" aria-hidden />
      Cumple
    </span>
  );
}
