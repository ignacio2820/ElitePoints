"use client";

import { useEffect, useState } from "react";

function calcularRestante(finIso: string): number {
  return Math.max(0, new Date(finIso).getTime() - Date.now());
}

function formatear(ms: number): { d: number; h: number; m: number; s: number } {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s };
}

export function CountdownSorteo({ fechaHoraFin }: { fechaHoraFin: string }) {
  const [restante, setRestante] = useState(() => calcularRestante(fechaHoraFin));

  useEffect(() => {
    const id = window.setInterval(() => {
      setRestante(calcularRestante(fechaHoraFin));
    }, 1000);
    return () => window.clearInterval(id);
  }, [fechaHoraFin]);

  const { d, h, m, s } = formatear(restante);
  const terminado = restante <= 0;

  return (
    <div
      className={
        terminado
          ? "rounded-2xl border border-bark-200 bg-cream-50 px-4 py-3 text-center text-sm font-semibold text-bark-500"
          : "rounded-2xl border border-terracotta-200/60 bg-gradient-to-br from-bark-800 to-bark-700 px-4 py-4 text-center shadow-soft"
      }
      role="timer"
      aria-live="polite"
    >
      {terminado ? (
        "Sorteo cerrado — esperando sorteo"
      ) : (
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {d > 0 ? (
            <Unidad valor={d} label="días" />
          ) : null}
          <Unidad valor={h} label="hs" />
          <span className="text-terracotta-400/80">:</span>
          <Unidad valor={m} label="min" />
          <span className="text-terracotta-400/80">:</span>
          <Unidad valor={s} label="seg" />
        </div>
      )}
    </div>
  );
}

function Unidad({ valor, label }: { valor: number; label: string }) {
  return (
    <div className="min-w-[3rem]">
      <p className="font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
        {String(valor).padStart(2, "0")}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-terracotta-300/90">
        {label}
      </p>
    </div>
  );
}
