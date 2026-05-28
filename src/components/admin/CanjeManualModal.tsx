"use client";

import { useEffect, useState } from "react";
import { Gift, Loader2, X } from "lucide-react";
import type { ClienteResumen } from "@/lib/huellitas/clientesService";
import type { Premio } from "@/lib/huellitas/types";
import { reproducirSonidoExitoCanje } from "@/lib/sound";
import { formatNumber } from "@/lib/utils";

interface Props {
  cliente: ClienteResumen;
  premios: Premio[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CanjeManualModal({
  cliente,
  premios,
  onClose,
  onSuccess
}: Props) {
  const [premioId, setPremioId] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activos = premios.filter((p) => p.activo !== false);
  const seleccionado = activos.find((p) => p.id === premioId);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!premioId) {
      setError("Elegí un premio.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/canjes/redimir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId: cliente.id, premioId })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "No pudimos registrar el canje.");
      }
      reproducirSonidoExitoCanje();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-overlay p-4 sm:items-center">
      <div className="modal-panel max-w-md">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="label-elegant">Canje en caja</p>
            <h2 className="font-display text-xl font-semibold text-bark-700">
              Canjear premio
            </h2>
            <p className="mt-1 text-sm text-bark-500">
              {cliente.nombre} · saldo{" "}
              <span className="font-bold text-[#FB8500]">
                {formatNumber(cliente.saldoHuellitas)}
              </span>{" "}
              Puntos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-bark-400 hover:bg-cream-100"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-bark-700">
            Premio
            <select
              className="input-elegant mt-1 w-full"
              value={premioId}
              onChange={(e) => setPremioId(e.target.value)}
              required
            >
              <option value="">Seleccionar…</option>
              {activos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({formatNumber(p.costoHuellitas)} Puntos
                  {typeof p.stock === "number" ? ` · stock ${p.stock}` : ""})
                </option>
              ))}
            </select>
          </label>

          {seleccionado ? (
            <p className="flex items-center gap-2 rounded-xl bg-cream-50 px-3 py-2 text-xs text-bark-600">
              <Gift size={14} className="text-[#FB8500]" />
              Se descontarán {formatNumber(seleccionado.costoHuellitas)} Puntos
              y el stock del premio (si aplica), en una sola transacción.
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={guardando || activos.length === 0}
            className="btn-primary inline-flex w-full items-center justify-center gap-2"
          >
            {guardando ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Procesando…
              </>
            ) : (
              "Confirmar canje"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
