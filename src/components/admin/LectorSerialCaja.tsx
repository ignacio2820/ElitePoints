"use client";

import { useState } from "react";
import { Cable, Loader2, Unplug } from "lucide-react";
import { useLectorSerialCaja } from "@/hooks/useLectorSerialCaja";

interface Props {
  onClienteId: (clienteId: string) => void;
}

/**
 * Conexión RS-232 vía Web Serial (caja en PC). Oculto en móvil (ahí va el QR por cámara).
 */
export function LectorSerialCaja({ onClienteId }: Props) {
  const [aviso, setAviso] = useState<string | null>(null);

  const { disponible, conectado, conectando, conectar, desconectar } =
    useLectorSerialCaja({
      onClienteId,
      onError: setAviso
    });

  if (!disponible) return null;

  return (
    <div className="hidden md:block">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-bark-100 bg-cream-50/80 px-4 py-3">
        <Cable size={18} className="shrink-0 text-bark-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-bark-700">Lector RS-232 (USB)</p>
          <p className="text-xs text-bark-500">
            Conectá el escáner y escaneá el QR o código del cliente; al leer, el
            foco pasa al monto.
          </p>
        </div>
        {conectado ? (
          <button
            type="button"
            onClick={() => void desconectar()}
            className="inline-flex items-center gap-2 rounded-xl border border-bark-200 bg-white px-3 py-2 text-sm font-semibold text-bark-700 transition hover:bg-cream-50"
          >
            <Unplug size={16} />
            Desconectar
          </button>
        ) : (
          <button
            type="button"
            disabled={conectando}
            onClick={() => {
              setAviso(null);
              void conectar();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            {conectando ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Cable size={16} />
            )}
            {conectando ? "Conectando…" : "Conectar lector"}
          </button>
        )}
        {conectado ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Escuchando
          </span>
        ) : null}
      </div>
      {aviso ? (
        <p className="mt-2 text-xs text-amber-800" role="status">
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
