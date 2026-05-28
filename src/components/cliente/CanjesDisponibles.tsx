"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Bone, Gift, Loader2, Lock, Package, Stethoscope } from "lucide-react";
import { PuntoIcon } from "@/components/PuntoIcon";
import {
  aumentarCatalogo,
  type PremioAumentado
} from "@/lib/huellitas/engine";
import type { NivelLealtad, Premio } from "@/lib/huellitas/types";
import { formatNumber } from "@/lib/utils";
import { TicketCanjeModal, type TicketCanje } from "./TicketCanjeModal";
import { ConfirmarCanjeModal } from "./ConfirmarCanjeModal";
import { ExitoCanjeModal } from "./ExitoCanjeModal";
import { PremioCatalogoCard } from "./PremioCatalogoCard";

export interface CanjesDisponiblesProps {
  premios: Premio[];
  /**
   * Saldo DISPONIBLE del cliente (saldoHuellitas - huellitasReservadas).
   * Es lo que se compara contra el costo del premio para decidir si está
   * desbloqueado y para el mensaje "te faltan X puntos".
   */
  saldoCliente: number;
  /** Valor en pesos de 1 huellita, para mostrar equivalencias. */
  valorMonetarioHuellita?: number;
  nivelCliente: NivelLealtad;
  niveles: NivelLealtad[];
  tema?: "premium" | "warm";
  /** `catalog`: grid 2 cols móvil / auto-fill desktop (vista dedicada). */
  layout?: "embedded" | "page" | "catalog";
  /** @deprecated Usar `layout="embedded"`. */
  embedded?: boolean;
  /** Si es false, no se llama a la API (p. ej. vista demo pública). */
  puedeCanjear?: boolean;
  /** Tras crear el ticket con éxito: actualiza saldo en el panel padre. */
  onCanjeExitoso?: (saldoDisponible: number, costoHuellitas: number) => void;
}

function descripcionCorta(text: string | undefined, max = 120): string {
  if (!text?.trim()) return "Canjealo en el comercio con tu cupón.";
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export function CanjesDisponibles({
  premios,
  saldoCliente,
  valorMonetarioHuellita = 0,
  nivelCliente,
  niveles,
  layout: layoutProp,
  embedded = false,
  puedeCanjear = true,
  onCanjeExitoso
}: CanjesDisponiblesProps) {
  const layout = layoutProp ?? (embedded ? "embedded" : "page");
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketCanje | null>(null);
  const [pidiendoId, setPidiendoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saldoLocal, setSaldoLocal] = useState(saldoCliente);
  const [confirmando, setConfirmando] = useState<Premio | null>(null);
  const [mostrarExito, setMostrarExito] = useState(false);
  const [saldoExito, setSaldoExito] = useState<number | undefined>();

  useEffect(() => {
    setSaldoLocal(saldoCliente);
  }, [saldoCliente]);

  const aumentado = aumentarCatalogo(premios, {
    saldoCliente: saldoLocal,
    nivelCliente,
    niveles,
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

  async function confirmarYPedirTicket(premio: Premio) {
    if (!premio.id) return;
    if (!puedeCanjear) {
      setError("Iniciá sesión en Mi cuenta para generar cupones de canje.");
      return;
    }
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
        valorDescuento:
          typeof data.premio.valorDescuento === "number"
            ? data.premio.valorDescuento
            : undefined,
        clienteNombre: data.clienteNombre
      });
      const nuevoSaldo =
        typeof data.saldoDisponibleFinal === "number"
          ? data.saldoDisponibleFinal
          : Math.max(0, saldoLocal - premio.costoHuellitas);
      setSaldoLocal(nuevoSaldo);
      setSaldoExito(nuevoSaldo);
      setMostrarExito(true);
      onCanjeExitoso?.(nuevoSaldo, premio.costoHuellitas);
      router.refresh();
      setConfirmando(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error");
    } finally {
      setPidiendoId(null);
    }
  }

  function abrirConfirmacion(premio: Premio) {
    setError(null);
    if (!puedeCanjear) {
      setError("Iniciá sesión en Mi cuenta para canjear premios.");
      return;
    }
    setConfirmando(premio);
  }

  return (
    <>
      {layout === "catalog" ? (
        <div>
          {error ? (
            <div className="mb-4 rounded-2xl bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {ordenados.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-bark-200 bg-white px-4 py-12 text-center font-sans text-sm text-bark-500">
              Todavía no hay premios disponibles en el catálogo.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
              {ordenados.map((item) => (
                <PremioCatalogoCard
                  key={item.premio.id ?? item.premio.nombre}
                  item={item}
                  pidiendo={pidiendoId === item.premio.id}
                  onCanjear={() => abrirConfirmacion(item.premio)}
                />
              ))}
            </div>
          )}
        </div>
      ) : layout === "embedded" ? (
        <div>
          {error ? (
            <div className="mb-4 rounded-2xl bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {ordenados.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/25 px-4 py-8 text-center font-sans text-sm text-white/80">
              Todavía no hay premios disponibles.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {ordenados.map((item, index) => (
                <PremioCard
                  key={item.premio.id ?? item.premio.nombre}
                  item={item}
                  pidiendo={pidiendoId === item.premio.id}
                  onCupón={() => abrirConfirmacion(item.premio)}
                  embedded
                  tone={index % 2 === 0 ? "green" : "orange"}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <section className="surface-card rounded-3xl p-5 sm:p-6">
          <header className="mb-5">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-bark-700">
              Tus Recompensas
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-bark-500">
              Elegí un premio y obtené un cupón con código para mostrar en caja.
              Las puntos se descuentan al generar el cupón; el local confirma
              la entrega cuando te entrega el premio o el descuento.
            </p>
          </header>

          {error ? (
            <div className="mb-4 rounded-2xl bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {ordenados.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-bark-200 px-4 py-8 text-center font-sans text-sm text-bark-500">
              Todavía no hay premios disponibles.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {ordenados.map((item, index) => (
                <PremioCard
                  key={item.premio.id ?? item.premio.nombre}
                  item={item}
                  pidiendo={pidiendoId === item.premio.id}
                  onCupón={() => abrirConfirmacion(item.premio)}
                  embedded={false}
                  tone={index % 2 === 0 ? "green" : "orange"}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <ConfirmarCanjeModal
        premio={confirmando}
        saldoDisponible={saldoLocal}
        valorMonetarioHuellita={valorMonetarioHuellita}
        pidiendo={!!confirmando && pidiendoId === confirmando.id}
        onConfirmar={() => confirmando && confirmarYPedirTicket(confirmando)}
        onCancelar={() => {
          if (pidiendoId) return;
          setConfirmando(null);
        }}
      />

      <TicketCanjeModal
        ticket={mostrarExito ? null : ticket}
        onClose={() => setTicket(null)}
      />

      <ExitoCanjeModal
        abierto={mostrarExito}
        saldoDisponible={saldoExito}
        onCerrar={() => setMostrarExito(false)}
      />
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
      ? "bg-bark-800 ring-1 ring-white/10 text-white"
      : "bg-terracotta-400 text-white";

  let boton: ReactNode;
  if (desbloqueado) {
    boton = (
      <button
        type="button"
        onClick={onCupón}
        disabled={pidiendo}
        className={
          embedded
            ? "btn-primary mt-auto w-full justify-center text-sm uppercase tracking-[0.1em] disabled:cursor-not-allowed disabled:opacity-60"
            : "btn-primary mt-auto w-full justify-center py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {pidiendo ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Generando…
          </span>
        ) : embedded ? (
          "Canjear"
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
        className={
          embedded
            ? "mt-auto w-full cursor-not-allowed rounded-full border border-white/25 bg-white/10 py-2.5 font-sans text-sm font-semibold text-white/80"
            : "mt-auto w-full cursor-not-allowed rounded-full border border-bark-100 bg-cream-50 py-3 font-sans text-sm font-medium text-bark-400"
        }
      >
        Te faltan {formatNumber(faltanHuellitas)} puntos
      </button>
    );
  } else if (motivo === "nivel" && nivelMinimo) {
    boton = (
      <button
        type="button"
        disabled
        className={
          embedded
            ? "mt-auto w-full cursor-not-allowed rounded-full border border-white/25 bg-white/10 py-2.5 font-sans text-sm font-semibold text-white/80"
            : "mt-auto w-full cursor-not-allowed rounded-full border border-bark-100 bg-cream-50 py-3 font-sans text-sm font-medium text-bark-400"
        }
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
        className={
          embedded
            ? "mt-auto w-full cursor-not-allowed rounded-full border border-white/25 bg-white/10 py-2.5 font-sans text-sm font-semibold text-white/80"
            : "mt-auto w-full cursor-not-allowed rounded-full border border-bark-100 bg-cream-50 py-3 font-sans text-sm font-medium text-bark-400"
        }
      >
        Sin stock
      </button>
    );
  } else {
    boton = (
      <button
        type="button"
        disabled
        className={
          embedded
            ? "mt-auto w-full cursor-not-allowed rounded-full border border-white/25 bg-white/10 py-2.5 font-sans text-sm font-semibold text-white/80"
            : "mt-auto w-full cursor-not-allowed rounded-full border border-bark-100 bg-cream-50 py-3 font-sans text-sm font-medium text-bark-400"
        }
      >
        No disponible
      </button>
    );
  }

  return (
    <article
      className={
        embedded
          ? `flex h-full min-h-[15rem] flex-col rounded-3xl p-5 shadow-soft ${cardTone}`
          : "surface-card flex h-full flex-col rounded-3xl p-5 transition-shadow duration-200 hover:shadow-soft"
      }
    >
      {embedded ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white">
          <Icono size={24} />
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
        {embedded ? (
          <PuntoIcon size={22} className="shrink-0 text-white" />
        ) : (
          <PuntoIcon size={22} className="shrink-0 text-bark-500" />
        )}
        <span className={embedded ? "text-2xl font-extrabold tabular-nums" : "text-lg font-bold tabular-nums tracking-tight"}>
          {formatNumber(premio.costoHuellitas)}
        </span>
        <span className={embedded ? "ml-1 text-sm font-semibold text-white/85" : "text-sm font-medium text-bark-500"}>
          puntos
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
