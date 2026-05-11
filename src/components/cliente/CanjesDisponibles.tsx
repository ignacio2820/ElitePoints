"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Loader2, Lock } from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import {
  aumentarCatalogo,
  type PremioAumentado
} from "@/lib/huellitas/engine";
import type { NivelLealtad, Premio } from "@/lib/huellitas/types";
import { cn, formatNumber } from "@/lib/utils";
import { TicketCanjeModal, type TicketCanje } from "./TicketCanjeModal";

export interface CanjesDisponiblesProps {
  premios: Premio[];
  saldoCliente: number;
  nivelCliente: NivelLealtad;
  niveles: NivelLealtad[];
  especiesCliente?: string[];
  tema?: "premium" | "warm";
}

/** Texto corto para cards (una o dos líneas). */
function descripcionCorta(text: string | undefined, max = 120): string {
  if (!text?.trim()) return "Canjealo en el local con tu cupón.";
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export function CanjesDisponibles({
  premios,
  saldoCliente,
  nivelCliente,
  niveles,
  especiesCliente,
  tema = "warm"
}: CanjesDisponiblesProps) {
  const [ticket, setTicket] = useState<TicketCanje | null>(null);
  const [pidiendoId, setPidiendoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const aumentado = aumentarCatalogo(premios, {
    saldoCliente,
    nivelCliente,
    niveles,
    especiesCliente
  });

  const ordenados = [...aumentado].sort((a, b) => {
    const score = (p: PremioAumentado) => {
      if (p.desbloqueado) return 0;
      if (p.motivo === "saldo") return 1;
      if (p.motivo === "stock") return 2;
      return 3;
    };
    const sa = score(a);
    const sb = score(b);
    if (sa !== sb) return sa - sb;
    return a.premio.costoHuellitas - b.premio.costoHuellitas;
  });

  async function pedirTicket(premio: Premio) {
    if (!premio.id) return;
    setError(null);
    setPidiendoId(premio.id);
    try {
      const res = await fetch("/api/canjes/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ premioId: premio.id })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "No pudimos generar tu cupón");
      }
      setTicket({
        codigo: data.codigo,
        expiraEn: data.expiraEn,
        premioNombre: data.premio.nombre,
        costoHuellitas: data.premio.costoHuellitas,
        clienteNombre: data.clienteNombre
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error");
    } finally {
      setPidiendoId(null);
    }
  }

  const isPremium = tema === "premium";

  return (
    <>
      <section
        className={cn(
          "rounded-2xl border p-5 sm:p-6",
          isPremium
            ? "border-amber-400/20 bg-gradient-to-b from-zinc-900/90 to-zinc-950"
            : "border-bark-100 bg-white shadow-sm"
        )}
      >
        <header className="mb-5">
          <h2
            className={cn(
              "font-sans text-xl font-semibold tracking-tight sm:text-2xl",
              isPremium ? "text-amber-50" : "text-bark-800"
            )}
          >
            Tus Recompensas
          </h2>
          <p
            className={cn(
              "mt-1 font-sans text-sm leading-snug",
              isPremium ? "text-amber-100/80" : "text-bark-500"
            )}
          >
            Elegí un premio y obtené un cupón para retirarlo en el local. El
            descuento de Huellitas se aplica cuando el vendedor confirma el
            canje.
          </p>
        </header>

        {error ? (
          <div
            className={cn(
              "mb-4 rounded-xl px-3 py-2 font-sans text-sm",
              isPremium
                ? "bg-red-950/50 text-red-200 ring-1 ring-red-500/20"
                : "bg-red-50 text-red-700"
            )}
          >
            {error}
          </div>
        ) : null}

        {ordenados.length === 0 ? (
          <p
            className={cn(
              "rounded-xl border border-dashed px-4 py-8 text-center font-sans text-sm",
              isPremium
                ? "border-amber-400/25 text-amber-100/75"
                : "border-bark-200 text-bark-500"
            )}
          >
            Todavía no hay premios disponibles.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {ordenados.map((item) => (
              <PremioCard
                key={item.premio.id ?? item.premio.nombre}
                item={item}
                isPremium={isPremium}
                pidiendo={pidiendoId === item.premio.id}
                onCupón={() => pedirTicket(item.premio)}
              />
            ))}
          </div>
        )}
      </section>

      <TicketCanjeModal ticket={ticket} onClose={() => setTicket(null)} />
    </>
  );
}

function PremioCard({
  item,
  isPremium,
  pidiendo,
  onCupón
}: {
  item: PremioAumentado;
  isPremium: boolean;
  pidiendo: boolean;
  onCupón: () => void;
}) {
  const { premio, desbloqueado, motivo, nivelMinimo, faltanHuellitas } = item;

  const cardCls = cn(
    "flex h-full flex-col rounded-2xl border p-4 transition-shadow duration-200",
    isPremium
      ? "border-amber-400/20 bg-black/40 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.8)] hover:border-amber-400/35"
      : "border-bark-100 bg-cream-50/80 hover:shadow-md"
  );

  let boton: ReactNode;
  if (desbloqueado) {
    boton = (
      <button
        type="button"
        onClick={onCupón}
        disabled={pidiendo}
        className={cn(
          "mt-auto w-full rounded-xl py-3 font-sans text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
          isPremium
            ? "bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-zinc-950 shadow-lg shadow-amber-900/30 hover:from-amber-200 hover:to-amber-400"
            : "bg-gradient-to-r from-amber-400 to-amber-600 text-white hover:from-amber-300 hover:to-amber-500"
        )}
      >
        {pidiendo ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Generando…
          </span>
        ) : (
          "Obtener Cupón"
        )}
      </button>
    );
  } else if (motivo === "saldo") {
    boton = (
      <button
        type="button"
        disabled
        className={cn(
          "mt-auto w-full cursor-not-allowed rounded-xl py-3 font-sans text-sm font-medium",
          isPremium
            ? "border border-white/10 bg-white/5 text-amber-100/55"
            : "border border-bark-100 bg-bark-50 text-bark-400"
        )}
      >
        Te faltan {formatNumber(faltanHuellitas)} huellitas
      </button>
    );
  } else if (motivo === "nivel" && nivelMinimo) {
    boton = (
      <button
        type="button"
        disabled
        className={cn(
          "mt-auto w-full cursor-not-allowed rounded-xl py-3 font-sans text-sm font-medium",
          isPremium
            ? "border border-white/10 bg-white/5 text-amber-100/55"
            : "border border-bark-100 bg-bark-50 text-bark-400"
        )}
      >
        <span className="inline-flex items-center justify-center gap-1.5">
          <Lock size={14} /> Subí a {nivelMinimo.nombre}
        </span>
      </button>
    );
  } else if (motivo === "stock") {
    boton = (
      <button
        type="button"
        disabled
        className={cn(
          "mt-auto w-full cursor-not-allowed rounded-xl py-3 font-sans text-sm font-medium",
          isPremium
            ? "border border-white/10 bg-white/5 text-amber-100/55"
            : "border border-bark-100 bg-bark-50 text-bark-400"
        )}
      >
        Sin stock
      </button>
    );
  } else {
    boton = (
      <button
        type="button"
        disabled
        className={cn(
          "mt-auto w-full cursor-not-allowed rounded-xl py-3 font-sans text-sm font-medium",
          isPremium
            ? "border border-white/10 bg-white/5 text-amber-100/55"
            : "border border-bark-100 bg-bark-50 text-bark-400"
        )}
      >
        No disponible
      </button>
    );
  }

  return (
    <article className={cardCls}>
      <h3
        className={cn(
          "font-sans text-base font-semibold leading-snug tracking-tight",
          isPremium ? "text-amber-50" : "text-bark-800"
        )}
      >
        {premio.nombre}
      </h3>
      <p
        className={cn(
          "mt-2 line-clamp-2 min-h-[2.5rem] font-sans text-sm leading-relaxed",
          isPremium ? "text-amber-100/75" : "text-bark-500"
        )}
      >
        {descripcionCorta(premio.descripcion)}
      </p>

      <div
        className={cn(
          "mt-4 flex items-center gap-2 font-sans",
          isPremium ? "text-amber-200" : "text-bark-700"
        )}
      >
        <HuellitaIcon
          size={22}
          className={cn(
            "shrink-0",
            isPremium ? "text-amber-400" : "text-amber-500"
          )}
        />
        <span className="text-lg font-bold tabular-nums tracking-tight">
          {formatNumber(premio.costoHuellitas)}
        </span>
        <span className={cn("text-sm font-medium", isPremium ? "text-amber-100/70" : "text-bark-500")}>
          huellitas
        </span>
      </div>

      <div className="mt-4">{boton}</div>
    </article>
  );
}
