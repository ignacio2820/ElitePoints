"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { formatNumber } from "@/lib/utils";

export interface ExitoCanjeModalProps {
  abierto: boolean;
  saldoDisponible?: number;
  onCerrar: () => void;
}

export function ExitoCanjeModal({
  abierto,
  saldoDisponible,
  onCerrar
}: ExitoCanjeModalProps) {
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exito-canje-titulo"
    >
      <button
        type="button"
        className="absolute inset-0 bg-bark-900/55 backdrop-blur-sm"
        aria-label="Cerrar"
        onClick={onCerrar}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-cream-50 shadow-soft ring-1 ring-bark-100">
        <div className="bg-gradient-to-br from-emerald-700 to-bark-700 px-6 py-8 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-4 ring-white/20">
            <CheckCircle2 size={36} className="text-terracotta-300" />
          </div>
          <h2
            id="exito-canje-titulo"
            className="mt-5 font-display text-2xl font-bold leading-tight"
          >
            ¡Muchas gracias por tu canje!
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/90">
            Tu solicitud ha sido procesada con éxito y de forma segura.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          {typeof saldoDisponible === "number" ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-bark-100 bg-white px-4 py-3">
              <HuellitaIcon size={22} className="text-terracotta-500" />
              <p className="text-sm text-bark-600">
                Saldo disponible:{" "}
                <strong className="text-lg font-bold tabular-nums text-bark-800">
                  {formatNumber(saldoDisponible)}
                </strong>{" "}
                huellitas
              </p>
            </div>
          ) : null}
          <p className="text-center text-xs leading-relaxed text-bark-500">
            Mostrá el cupón con código en el local. Cuando te entreguen el premio,
            el equipo lo confirmará desde caja.
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className="btn-primary w-full justify-center"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
