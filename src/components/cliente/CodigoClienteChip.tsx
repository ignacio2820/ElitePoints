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
          ? "border-terracotta-200 bg-terracotta-50 text-bark-700 hover:bg-terracotta-100"
          : "border-bark-200 bg-cream-100 text-bark-700 hover:bg-cream-200"
      )}
    >
      <span className="opacity-70">Código</span>
      <span className={cn("tabular-nums tracking-wider", esTopTier ? "text-bark-700" : "text-bark-800")}>
        {codigo}
      </span>
      {copiado ? (
        <Check size={12} className="text-emerald-600" />
      ) : (
        <Copy size={12} className="opacity-60 group-hover:opacity-100" />
      )}
    </button>
  );
}
