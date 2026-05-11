"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chip que muestra el código corto del cliente con un botón de copiar.
 * Pensado para ir en el header de /mi-cuenta. Tema dual: dorado para
 * top-tier (Premium Dark) o crema para los demás niveles.
 */
export function CodigoClienteChip({
  codigo,
  esTopTier
}: {
  codigo: string;
  esTopTier: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title="Copiar código"
      className={cn(
        "group flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition active:scale-95",
        esTopTier
          ? "border-amber-400/40 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"
          : "border-white/20 bg-white/10 text-cream-50 hover:bg-white/20"
      )}
    >
      <span className="opacity-70">Código</span>
      <span className={cn("tabular-nums tracking-wider", esTopTier ? "text-amber-200" : "text-cream-50")}>
        {codigo}
      </span>
      {copiado ? (
        <Check size={12} className={esTopTier ? "text-emerald-300" : "text-emerald-200"} />
      ) : (
        <Copy size={12} className="opacity-60 group-hover:opacity-100" />
      )}
    </button>
  );
}
