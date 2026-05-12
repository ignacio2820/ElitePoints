"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import type { ClienteResumen } from "@/lib/huellitas/clientesService";
import { formatARS, formatNumber } from "@/lib/utils";

interface Props {
  cliente: ClienteResumen;
  montoParaUnaHuellita: number;
  valorMonetarioHuellita: number;
  onClose: () => void;
  onSuccess: (actualizado: ClienteResumen) => void;
}

interface VentaResp {
  ok: boolean;
  error?: string;
  saldoFinal?: number;
  huellitasGeneradas?: number;
  acumuladoHistorico?: number;
  nivelId?: string;
}

export function AsignarHuellitasModal({
  cliente,
  montoParaUnaHuellita,
  valorMonetarioHuellita,
  onClose,
  onSuccess
}: Props) {
  const [monto, setMonto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<VentaResp | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const montoNum = Number(monto) || 0;
  const huellitasPrevistas = useMemo(() => {
    if (montoNum <= 0 || montoParaUnaHuellita <= 0) return 0;
    return Math.floor(montoNum / montoParaUnaHuellita);
  }, [montoNum, montoParaUnaHuellita]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (montoNum <= 0 || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localId: cliente.localId,
          clienteId: cliente.id,
          totalVenta: montoNum
        })
      });
      const data: VentaResp = await r.json();
      if (!r.ok || !data.ok) {
        setError(data.error ?? `Error ${r.status}`);
      } else {
        setResultado(data);
        onSuccess({
          ...cliente,
          saldoHuellitas: data.saldoFinal ?? cliente.saldoHuellitas,
          acumuladoHistorico:
            data.acumuladoHistorico ?? cliente.acumuladoHistorico,
          nivelId: data.nivelId ?? cliente.nivelId
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-panel max-w-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-bark-400">
              Sumar Huellitas a
            </p>
            <h2 className="font-display text-2xl font-semibold text-bark-700">
              {cliente.nombre}
            </h2>
            <p className="text-xs text-bark-400">
              Saldo actual:{" "}
              <span className="font-semibold text-bark-700">
                {formatNumber(cliente.saldoHuellitas)} Huellitas
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-100 text-bark-500 transition hover:bg-cream-200"
          >
            <X size={16} />
          </button>
        </div>

        {!resultado ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-bark-500">
                Monto de la compra
              </span>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-bark-100 bg-white px-3 py-3 transition focus-within:border-bark-400 focus-within:ring-2 focus-within:ring-bark-300/30">
                <span className="text-lg font-semibold text-bark-500">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={1}
                  autoFocus
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-2xl font-semibold text-bark-700 outline-none placeholder:text-bark-300"
                />
              </div>
              <p className="mt-2 text-xs text-bark-400">
                1 Huellita por cada {formatARS(montoParaUnaHuellita)} · Canje{" "}
                {formatARS(valorMonetarioHuellita)}/Huellita
              </p>
            </label>

            <div
              className={`rounded-2xl border p-4 transition ${
                huellitasPrevistas > 0
                  ? "border-bark-300 bg-cream-50"
                  : "border-bark-100 bg-cream-50/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-bark-400">
                    Va a sumar
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-4xl font-bold tabular-nums text-bark-700">
                      {formatNumber(huellitasPrevistas)}
                    </span>
                    <span className="text-sm text-bark-500">Huellitas</span>
                  </div>
                </div>
                <HuellitaIcon
                  size={36}
                  className={
                    huellitasPrevistas > 0 ? "text-bark-500" : "text-bark-200"
                  }
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={enviando || montoNum <= 0}
              className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enviando ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Registrando…
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Confirmar venta
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="mt-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="mt-4 font-display text-2xl font-semibold text-bark-700">
              ¡Venta registrada!
            </h3>
            <div className="mt-4 rounded-2xl bg-cream-50 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-bark-400">
                Nuevo saldo
              </p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <HuellitaIcon size={26} className="text-bark-500" />
                <span className="font-display text-4xl font-bold tabular-nums text-bark-700">
                  {formatNumber(resultado.saldoFinal ?? 0)}
                </span>
              </div>
              <p className="mt-1 text-xs text-bark-500">
                +{formatNumber(resultado.huellitasGeneradas ?? 0)} Huellitas en esta venta
              </p>
            </div>
            <button
              onClick={onClose}
              className="btn-primary mt-5 inline-flex"
            >
              Listo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
