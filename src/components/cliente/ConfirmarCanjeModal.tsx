"use client";

import { useEffect } from "react";
import { Gift, Loader2, X } from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { formatARS, formatNumber } from "@/lib/utils";
import type { Premio } from "@/lib/huellitas/types";

export interface ConfirmarCanjeModalProps {
  premio: Premio | null;
  saldoDisponible: number;
  valorMonetarioHuellita: number;
  pidiendo: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Modal de confirmación previa al canje.
 *
 * - Si el cliente tiene saldo suficiente: pregunta "¿Querés canjear X por
 *   Y huellitas? Te quedarán Z huellitas." con dos botones.
 * - Si NO alcanza: mensaje claro con cuántas huellitas faltan + un único
 *   botón "Entendido" (no deja confirmar accidentalmente).
 *
 * Evita canjes por error y dobles clicks.
 */
export function ConfirmarCanjeModal({
  premio,
  saldoDisponible,
  valorMonetarioHuellita,
  pidiendo,
  onConfirmar,
  onCancelar
}: ConfirmarCanjeModalProps) {
  useEffect(() => {
    if (!premio) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pidiendo) onCancelar();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [premio, pidiendo, onCancelar]);

  if (!premio) return null;

  const costo = premio.costoHuellitas;
  const alcanza = saldoDisponible >= costo;
  const faltan = Math.max(0, costo - saldoDisponible);
  const saldoTras = Math.max(0, saldoDisponible - costo);
  const descuento =
    typeof premio.valorDescuento === "number" && premio.valorDescuento >= 0
      ? premio.valorDescuento
      : costo * Math.max(0, valorMonetarioHuellita);

  return (
    <div className="modal-overlay sm:px-4">
      <div className="modal-panel relative max-w-md text-bark-700">
        <button
          onClick={onCancelar}
          disabled={pidiendo}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-2xl border border-bark-200 bg-white text-bark-600 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Cancelar"
        >
          <X size={16} />
        </button>

        <div className="px-6 pt-8 pb-2 text-center sm:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-terracotta-50 text-terracotta-500">
            <Gift size={24} />
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-terracotta-500">
            {alcanza ? "Confirmar canje" : "Te faltan huellitas"}
          </p>
          <h3 className="mt-2 font-display text-2xl font-bold leading-tight text-bark-700">
            {premio.nombre}
          </h3>
          {premio.descripcion ? (
            <p className="mt-2 text-sm leading-relaxed text-bark-600">
              {premio.descripcion}
            </p>
          ) : null}
        </div>

        <div className="mx-6 mt-5 rounded-2xl bg-cream-50 px-4 py-4 text-sm sm:mx-8">
          <div className="flex items-center justify-between font-medium text-bark-700">
            <span>Costo</span>
            <span className="inline-flex items-center gap-1.5 font-bold tabular-nums">
              {formatNumber(costo)}
              <HuellitaIcon size={14} className="text-terracotta-500" />
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-bark-600">
            <span>Equivale a</span>
            <span className="font-semibold tabular-nums text-bark-700">
              {formatARS(descuento)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-bark-600">
            <span>Tu saldo actual</span>
            <span className="font-semibold tabular-nums text-bark-700">
              {formatNumber(saldoDisponible)}
            </span>
          </div>
          {alcanza ? (
            <div className="mt-2 flex items-center justify-between text-bark-600">
              <span>Te quedan</span>
              <span className="font-bold tabular-nums text-bark-700">
                {formatNumber(saldoTras)}
              </span>
            </div>
          ) : null}
        </div>

        {alcanza ? (
          <div className="px-6 pt-4 pb-6 text-center text-sm leading-relaxed text-bark-600 sm:px-8">
            <p>
              Vamos a reservar{" "}
              <strong className="text-bark-700">
                {formatNumber(costo)} huellitas
              </strong>{" "}
              y generar tu código. Mostralo al vendedor para retirar el premio.
            </p>
          </div>
        ) : (
          <div className="mx-6 mt-4 rounded-2xl border border-terracotta-200 bg-terracotta-50 px-4 py-3 text-center text-sm font-medium text-bark-700 sm:mx-8">
            Te faltan{" "}
            <strong className="text-terracotta-500">
              {formatNumber(faltan)} huellitas
            </strong>{" "}
            para canjear este premio. Sumá más en tu próxima compra.
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-bark-100 px-6 py-4 sm:grid-cols-2 sm:px-8">
          {alcanza ? (
            <>
              <button
                type="button"
                onClick={onCancelar}
                disabled={pidiendo}
                className="inline-flex w-full items-center justify-center rounded-full border border-bark-200 bg-white px-4 py-2.5 text-sm font-semibold text-bark-700 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirmar}
                disabled={pidiendo}
                className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pidiendo ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generando…
                  </>
                ) : (
                  "Sí, canjear"
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onCancelar}
              className="btn-primary col-span-full inline-flex w-full items-center justify-center"
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
