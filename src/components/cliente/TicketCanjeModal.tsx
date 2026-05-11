"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { formatNumber } from "@/lib/utils";

export interface TicketCanje {
  codigo: string;
  expiraEn: string;
  premioNombre: string;
  costoHuellitas: number;
  clienteNombre: string;
}

export interface TicketCanjeModalProps {
  ticket: TicketCanje | null;
  onClose: () => void;
}

export function TicketCanjeModal({ ticket, onClose }: TicketCanjeModalProps) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [ticket, onClose]);

  const expiraTexto = useMemo(() => {
    if (!ticket) return "";
    try {
      const d = new Date(ticket.expiraEn);
      return d.toLocaleString("es-AR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "";
    }
  }, [ticket]);

  if (!ticket) return null;

  async function copiar() {
    try {
      if (!ticket) return;
      await navigator.clipboard.writeText(ticket.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // ignore
    }
  }

  const codigoPretty = ticket.codigo.match(/.{1,2}/g)?.join(" ") ?? ticket.codigo;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-amber-400/40 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-amber-50 shadow-2xl sm:rounded-3xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-amber-50 transition hover:bg-white/20"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>

        <div className="relative px-6 pt-8 pb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-300/80">
            Ticket de canje
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-amber-50">
            {ticket.premioNombre}
          </h3>
          <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-amber-200/80">
            <HuellitaIcon size={14} className="text-amber-300" />
            {formatNumber(ticket.costoHuellitas)} Huellitas
          </div>
        </div>

        <div className="relative mx-6 rounded-2xl border border-amber-400/30 bg-black/40 px-4 py-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-300/70">
            Mostrale este codigo al vendedor
          </p>
          <p className="mt-3 font-mono text-4xl font-bold tracking-[0.3em] text-amber-300 sm:text-5xl">
            {codigoPretty}
          </p>
          <button
            onClick={copiar}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20"
          >
            {copiado ? <Check size={12} /> : <Copy size={12} />}
            {copiado ? "Copiado" : "Copiar codigo"}
          </button>
        </div>

        <div className="relative px-6 pt-4 pb-7 text-center text-xs text-amber-100/70">
          <p>
            <strong className="text-amber-200">{ticket.clienteNombre}</strong>,
            mostrale este codigo al vendedor para retirar tu premio. Tus
            Huellitas se descuentan recien cuando el local confirma el canje.
          </p>
          {expiraTexto ? (
            <p className="mt-3 text-[11px] uppercase tracking-widest text-amber-300/60">
              Valido hasta {expiraTexto}
            </p>
          ) : null}
        </div>

        <div className="relative bg-black/60 px-6 py-4 text-center">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-4 py-3 font-semibold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-200 hover:to-amber-400"
          >
            Listo, ya lo tengo
          </button>
        </div>
      </div>
    </div>
  );
}
