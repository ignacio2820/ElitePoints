"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import type { CanjePendienteResumen } from "@/lib/huellitas/canjeService";
import { extraerCodigoCanjeDesdeQr } from "@/lib/huellitas/parseCanjeQr";
import { reproducirSonidoExitoCanje } from "@/lib/sound";
import { cn, formatARS, formatNumber } from "@/lib/utils";

export interface CanjesPendientesPanelProps {
  ticketsIniciales: CanjePendienteResumen[];
}

export function CanjesPendientesPanel({
  ticketsIniciales
}: CanjesPendientesPanelProps) {
  const router = useRouter();
  const [tickets, setTickets] = useState(ticketsIniciales);
  const [codigo, setCodigo] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();

  async function refrescar() {
    setError(null);
    startRefresh(async () => {
      try {
        const res = await fetch("/api/admin/canjes/pendientes", {
          cache: "no-store"
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error ?? "No pudimos refrescar");
          return;
        }
        setTickets(data.tickets ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }

  async function confirmar(codigoAConfirmar: string) {
    setError(null);
    setSuccess(null);
    const codigoNorm =
      extraerCodigoCanjeDesdeQr(codigoAConfirmar) ??
      codigoAConfirmar.trim().toUpperCase();
    if (!codigoNorm) {
      setError("Ingresá un código de canje válido.");
      return;
    }
    setPendingId(codigoNorm);
    try {
      const res = await fetch("/api/admin/canjes/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoNorm })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No pudimos confirmar");
        return;
      }
      setSuccess(
        `Canje confirmado: -${formatNumber(data.huellitasDescontadas)} Huellitas (${data.premioNombre}). Saldo final: ${formatNumber(data.saldoFinal)}.`
      );
      reproducirSonidoExitoCanje();
      setTickets((prev) => prev.filter((t) => t.codigo !== codigoNorm));
      setCodigo("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-bark-400">
            <ShieldCheck size={16} />
            <span className="label-elegant">Confirmar canje rapido</span>
          </div>
          <CardTitle className="mt-2">Ingresa el codigo del cliente</CardTitle>
          <CardDescription>
            Si el cliente te dicta el codigo, escribilo aca para confirmar el
            retiro al instante.
          </CardDescription>
        </CardHeader>

        <Field label="Codigo del ticket">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="input-elegant flex-1 font-mono uppercase tracking-[0.25em]"
              maxLength={20}
              value={codigo}
              onChange={(e) =>
                setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              placeholder="EJ: BX9F2K"
            />
            <button
              onClick={() => codigo && confirmar(codigo)}
              disabled={!codigo || pendingId === codigo}
              className="btn-primary inline-flex items-center gap-2"
            >
              {pendingId === codigo ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Confirmar
            </button>
          </div>
        </Field>

        {error ? (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Tickets activos</CardTitle>
              <CardDescription>
                Confirmar descuenta huellitas y entrega el premio.
              </CardDescription>
            </div>
            <button
              onClick={refrescar}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-bark-100 bg-white px-3 py-1.5 text-xs font-semibold text-bark-500 transition hover:bg-cream-100"
            >
              <RefreshCw size={12} className={cn(refreshing && "animate-spin")} />
              Refrescar
            </button>
          </div>
        </CardHeader>

        {tickets.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-bark-200 p-8 text-center text-sm text-[color:var(--muted)]">
            No hay tickets pendientes ahora mismo.
          </p>
        ) : (
          <ul className="space-y-3">
            {tickets.map((t) => (
              <li
                key={t.codigo}
                className={cn(
                  "rounded-2xl border p-4",
                  t.expirado
                    ? "border-bark-100 bg-cream-50/60 opacity-70"
                    : "border-bark-100 bg-white"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-bark-400">
                      <Clock size={11} />
                      {fechaCorta(t.creadoEn)}
                      {t.expirado ? <span className="text-red-500">expirado</span> : null}
                    </div>
                    <h4 className="mt-1 truncate font-display text-lg font-bold text-bark-700">
                      {t.premioNombre}
                    </h4>
                    <p className="text-xs font-medium text-bark-600">
                      Cliente:{" "}
                      <strong className="text-bark-700">
                        {t.clienteNombre}
                      </strong>
                    </p>
                    <div className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-bark-700">
                      {formatNumber(t.costoHuellitas)}
                      <HuellitaIcon
                        size={12}
                        className="text-terracotta-500"
                      />
                      {typeof t.valorDescuento === "number" &&
                      t.valorDescuento > 0 ? (
                        <span className="ml-1 rounded-full bg-terracotta-50 px-2 py-0.5 text-[11px] font-bold text-terracotta-500">
                          {formatARS(t.valorDescuento)} OFF
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="font-mono text-2xl font-bold tracking-[0.25em] text-bark-700">
                      {t.codigo}
                    </p>
                    <button
                      onClick={() => confirmar(t.codigo)}
                      disabled={t.expirado || pendingId === t.codigo}
                      className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {pendingId === t.codigo ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Confirmar canje
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function fechaCorta(d?: Date | string): string {
  if (!d) return "";
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}
