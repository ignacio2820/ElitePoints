"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { payloadQrCanje } from "@/lib/qr/scannerPayloads";
import { QrEscanerFisico } from "@/components/qr/QrEscanerFisico";
import { BrilloMaximoQr } from "@/components/qr/BrilloMaximoQr";
import { formatARS, formatNumber } from "@/lib/utils";

export interface TicketCanje {
  codigo: string;
  expiraEn: string;
  premioNombre: string;
  costoHuellitas: number;
  /** Valor en pesos del descuento (snapshot al canjear). */
  valorDescuento?: number;
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

  const payloadQr = ticket ? payloadQrCanje(ticket.codigo) : "";

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
    <BrilloMaximoQr activo className="modal-overlay sm:px-4">
      <div className="modal-panel relative max-w-md overflow-hidden bg-[#FFFFFF] text-bark-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-2xl border border-bark-200 bg-white text-bark-600 transition hover:bg-cream-100"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>

        <div className="px-6 pt-8 pb-4 text-center sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-terracotta-500">
            Ticket de canje
          </p>
          <h3 className="mt-2 font-display text-2xl font-bold text-bark-700">
            {ticket.premioNombre}
          </h3>
          <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-bark-700">
            <HuellitaIcon size={14} className="text-terracotta-500" />
            {formatNumber(ticket.costoHuellitas)} Huellitas
            {typeof ticket.valorDescuento === "number" &&
            ticket.valorDescuento > 0 ? (
              <span className="text-bark-600">
                · {formatARS(ticket.valorDescuento)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mx-6 rounded-3xl border border-neutral-200 bg-[#FFFFFF] px-4 py-5 text-center sm:mx-8">
          <QrEscanerFisico
            payload={payloadQr}
            size={280}
            alt={`QR del canje ${ticket.codigo}`}
            className="mx-auto"
            envolverBrillo={false}
          />
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-bark-600">
            Mostrale este código al vendedor
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-[0.3em] text-bark-700 sm:text-4xl">
            {codigoPretty}
          </p>
          <button
            onClick={copiar}
            className="btn-ghost mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            {copiado ? <Check size={12} /> : <Copy size={12} />}
            {copiado ? "Copiado" : "Copiar código"}
          </button>
        </div>

        <div className="px-6 pt-4 pb-6 text-center text-sm leading-relaxed text-bark-600 sm:px-8">
          <p>
            <strong className="text-bark-700">{ticket.clienteNombre}</strong>,
            mostrale el QR (o el código) al vendedor para retirar tu premio.
            Las huellitas quedan reservadas hasta que el local confirme.
          </p>
          {expiraTexto ? (
            <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-terracotta-500">
              Válido hasta {expiraTexto}
            </p>
          ) : null}
        </div>

        <div className="border-t border-bark-100 px-6 py-4 text-center sm:px-8">
          <button onClick={onClose} className="btn-primary w-full justify-center">
            Listo, ya lo tengo
          </button>
        </div>
      </div>
    </BrilloMaximoQr>
  );
}
