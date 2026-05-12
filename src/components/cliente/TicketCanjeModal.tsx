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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bark-800/40 backdrop-blur-sm sm:items-center sm:px-4">
      <div className="surface-card relative w-full max-w-md overflow-hidden rounded-t-3xl text-bark-800 sm:rounded-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-2xl border border-bark-200 bg-white text-bark-600 transition hover:bg-cream-100"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>

        <div className="px-6 pt-8 pb-6 text-center sm:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-bark-500">
            Ticket de canje
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-bark-700">
            {ticket.premioNombre}
          </h3>
          <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-bark-500">
            <HuellitaIcon size={14} className="text-bark-500" />
            {formatNumber(ticket.costoHuellitas)} Huellitas
          </div>
        </div>

        <div className="mx-6 rounded-2xl border border-dashed border-bark-200 bg-cream-50 px-4 py-6 text-center sm:mx-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-bark-500">
            Mostrale este codigo al vendedor
          </p>
          <p className="mt-3 font-mono text-4xl font-bold tracking-[0.3em] text-bark-700 sm:text-5xl">
            {codigoPretty}
          </p>
          <button
            onClick={copiar}
            className="btn-ghost mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            {copiado ? <Check size={12} /> : <Copy size={12} />}
            {copiado ? "Copiado" : "Copiar codigo"}
          </button>
        </div>

        <div className="px-6 pt-4 pb-6 text-center text-sm leading-relaxed text-bark-500 sm:px-8">
          <p>
            <strong className="text-bark-700">{ticket.clienteNombre}</strong>,
            mostrale este codigo al vendedor para retirar tu premio. Tus
            Huellitas se descuentan recien cuando el local confirma el canje.
          </p>
          {expiraTexto ? (
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-bark-400">
              Valido hasta {expiraTexto}
            </p>
          ) : null}
        </div>

        <div className="border-t border-bark-100 px-6 py-4 text-center sm:px-8">
          <button onClick={onClose} className="btn-primary w-full justify-center">
            Listo, ya lo tengo
          </button>
        </div>
      </div>
    </div>
  );
}
