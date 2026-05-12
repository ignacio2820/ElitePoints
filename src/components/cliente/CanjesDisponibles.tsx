"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Bone, Gift, Loader2, Lock, Package, Stethoscope } from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import {
  aumentarCatalogo,
  type PremioAumentado
} from "@/lib/huellitas/engine";
import type { NivelLealtad, Premio } from "@/lib/huellitas/types";
import { formatNumber } from "@/lib/utils";
import { TicketCanjeModal, type TicketCanje } from "./TicketCanjeModal";

export interface CanjesDisponiblesProps {
  premios: Premio[];
  saldoCliente: number;
  nivelCliente: NivelLealtad;
  niveles: NivelLealtad[];
  especiesCliente?: string[];
  tema?: "premium" | "warm";
  embedded?: boolean;
}

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
  embedded = false
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

  return (
    <>
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <header className="mb-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-bark-700">
            Tus Recompensas
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-bark-500">
            Elegí un premio y obtené un cupón para retirarlo en el local. El
            descuento de Huellitas se aplica cuando el vendedor confirma el
            canje.
          </p>
        </header>

        {error ? (
          <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {ordenados.length === 0 ? (
          <p className="rounded-xl border border-dashed border-bark-200 px-4 py-8 text-center font-sans text-sm text-bark-500">
            Todavía no hay premios disponibles.
          </p>
        ) : (
          <div
            className={
              embedded
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
                : "grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4"
            }
          >
            {ordenados.map((item, index) => (
              <PremioCard
                key={item.premio.id ?? item.premio.nombre}
                item={item}
                pidiendo={pidiendoId === item.premio.id}
                onCupón={() => pedirTicket(item.premio)}
                embedded={embedded}
                tone={index % 2 === 0 ? "green" : "orange"}
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
  pidiendo,
  onCupón,
  embedded = false,
  tone = "green"
}: {
  item: PremioAumentado;
  pidiendo: boolean;
  onCupón: () => void;
  embedded?: boolean;
  tone?: "green" | "orange";
}) {
  const { premio, desbloqueado, motivo, nivelMinimo, faltanHuellitas } = item;
  const Icono = iconoPremio(premio.categoria);
  const cardTone =
    tone === "green"
      ? "bg-bark-900 text-white"
      : "bg-terracotta-400 text-white";
  
  const btnColor =
    tone === "green"
      ? "bg-terracotta-400 hover:bg-terracotta-500 text-white border-transparent"
      : "bg-bark-900 hover:bg-bark-800 text-white border-transparent";

  let boton: ReactNode;
  if (desbloqueado) {
    boton = (
      <button
        type="button"
        onClick={onCupón}
        disabled={pidiendo}
        className={
          embedded
            ? `mt-auto inline-flex w-full items-center justify-center rounded-full border px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${btnColor}`
            : "btn-primary mt-auto w-full justify-center py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {pidiendo ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Generando…
          </span>
        ) : (
          embedded ? "Canjear" : "Obtener Cupón"
        )}
      </button>
    );
  } else if (motivo === "saldo") {
    boton = (
      <button
        type="button"
        disabled
        className="mt-auto w-full cursor-not-allowed rounded-xl border border-bark-100 bg-cream-50 py-3 font-sans text-sm font-medium text-bark-400"
      >
        Te faltan {formatNumber(faltanHuellitas)} huellitas
      </button>
    );
  } else if (motivo === "nivel" && nivelMinimo) {
    boton = (
      <button
        type="button"
        disabled
        className="mt-auto w-full cursor-not-allowed rounded-xl border border-bark-100 bg-cream-50 py-3 font-sans text-sm font-medium text-bark-400"
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
        className="mt-auto w-full cursor-not-allowed rounded-xl border border-bark-100 bg-cream-50 py-3 font-sans text-sm font-medium text-bark-400"
      >
        Sin stock
      </button>
    );
  } else {
    boton = (
      <button
        type="button"
        disabled
        className="mt-auto w-full cursor-not-allowed rounded-xl border border-bark-100 bg-cream-50 py-3 font-sans text-sm font-medium text-bark-400"
      >
        No disponible
      </button>
    );
  }

  return (
    <article
      className={
        embedded
          ? `flex h-full min-h-[15rem] flex-col rounded-[1.5rem] p-5 shadow-soft ${cardTone}`
          : "surface-card flex h-full flex-col p-5 transition-shadow duration-200 hover:shadow-soft"
      }
    >
      {embedded ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <Icono size={24} className="text-white" />
        </div>
      ) : null}
      <h3
        className={
          embedded
            ? "mt-4 font-display text-lg font-bold leading-snug text-white"
            : "font-sans text-base font-semibold leading-snug tracking-tight text-bark-800"
        }
      >
        {premio.nombre}
      </h3>
      <p
        className={
          embedded
            ? "mt-2 line-clamp-3 text-sm leading-relaxed text-white/80"
            : "mt-2 line-clamp-2 min-h-[2.5rem] font-sans text-sm leading-relaxed text-bark-500"
        }
      >
        {descripcionCorta(premio.descripcion)}
      </p>

      <div
        className={
          embedded
            ? "mt-4 text-sm font-bold text-white"
            : "mt-4 flex items-center gap-2 font-sans text-bark-700"
        }
      >
        {embedded ? null : <HuellitaIcon size={22} className="shrink-0 text-bark-500" />}
        <span className={embedded ? "text-2xl font-extrabold tabular-nums" : "text-lg font-bold tabular-nums tracking-tight"}>
          {formatNumber(premio.costoHuellitas)}
        </span>
        <span className={embedded ? "ml-1 text-sm font-semibold text-white/85" : "text-sm font-medium text-bark-500"}>
          huellitas
        </span>
      </div>

      <div className="mt-4">{boton}</div>
    </article>
  );
}

function iconoPremio(categoria?: string) {
  switch (categoria) {
    case "servicio":
      return Stethoscope;
    case "juguete":
      return Bone;
    case "alimento":
      return Package;
    default:
      return Gift;
  }
}
