"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Gift,
  Loader2,
  Plus,
  ScanLine,
  Search,
  Users,
  X
} from "lucide-react";
import { calcularNivel, progresoNivel } from "@/lib/huellitas/engine";
import { NivelBadge } from "@/components/NivelBadge";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import type { ClienteResumen } from "@/lib/huellitas/clientesService";
import type { NivelLealtad, Premio } from "@/lib/huellitas/types";
import { formatARS, formatNumber } from "@/lib/utils";
import { AsignarHuellitasModal } from "./AsignarHuellitasModal";
import { CanjeManualModal } from "./CanjeManualModal";

interface Props {
  clientesIniciales: ClienteResumen[];
  premios: Premio[];
  niveles: NivelLealtad[];
  valorMonetarioHuellita: number;
  montoParaUnaHuellita: number;
}

export function BuscadorClientes({
  clientesIniciales,
  premios,
  niveles,
  valorMonetarioHuellita,
  montoParaUnaHuellita
}: Props) {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<ClienteResumen[]>(clientesIniciales);
  const [buscando, setBuscando] = useState(false);
  const [seleccionado, setSeleccionado] = useState<ClienteResumen | null>(null);
  const [canjeCliente, setCanjeCliente] = useState<ClienteResumen | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResultados(clientesIniciales);
      return;
    }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/admin/clientes/buscar?q=${encodeURIComponent(q)}`,
          { cache: "no-store" }
        );
        const data = (await r.json()) as {
          ok: boolean;
          clientes?: ClienteResumen[];
        };
        if (data.ok && data.clientes) setResultados(data.clientes);
      } finally {
        setBuscando(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, clientesIniciales]);

  const total = clientesIniciales.length;
  const mostrandoFiltro = q.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* Buscador sticky */}
      <div className="sticky top-[68px] z-10 -mx-2 rounded-2xl border border-bark-100 bg-cream-50/90 p-2 backdrop-blur md:top-[80px]">
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-bark-100">
          <Search size={16} className="text-bark-400" />
          <input
            type="search"
            placeholder="Buscar por nombre, email o teléfono…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-bark-700 outline-none placeholder:text-bark-300"
          />
          {buscando && <Loader2 size={14} className="animate-spin text-bark-400" />}
          {q && !buscando && (
            <button
              onClick={() => setQ("")}
              className="rounded-full p-1 text-bark-400 hover:bg-cream-100"
              title="Limpiar"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between px-1 text-xs text-bark-400">
          <span>
            {mostrandoFiltro
              ? `${resultados.length} resultados${q ? ` para "${q}"` : ""}`
              : `${total} cliente${total === 1 ? "" : "s"} en tu local`}
          </span>
          <span>1 Huellita = {formatARS(valorMonetarioHuellita)}</span>
        </div>
      </div>

      {/* Empty state */}
      {resultados.length === 0 && (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <Users size={32} className="text-bark-300" />
          <p className="font-display text-lg font-semibold text-bark-600">
            No encontramos clientes
          </p>
          <p className="text-sm text-bark-400">
            {mostrandoFiltro
              ? "Probá con otro término o limpiá el filtro."
              : "Cuando registres tu primer cliente aparecerá acá."}
          </p>
        </div>
      )}

      {/* Grid de resultados */}
      <div className="grid gap-3 md:grid-cols-2">
        {resultados.map((c) => {
          const nivel = calcularNivel(c.acumuladoHistorico, niveles);
          const prog = progresoNivel(c.acumuladoHistorico, niveles);
          const valorPesos = c.saldoHuellitas * valorMonetarioHuellita;
          return (
            <div
              key={c.id}
              className="group relative rounded-2xl border border-bark-100 bg-white p-4 transition hover:border-bark-200 hover:shadow-soft"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cream-100 font-display text-lg font-semibold text-bark-600">
                  {c.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-semibold text-bark-700">
                        {c.nombre}
                      </p>
                      {c.codigoCliente && (
                        <p className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-amber-800">
                          {c.codigoCliente}
                        </p>
                      )}
                      {c.email && (
                        <p className="mt-0.5 truncate text-xs text-bark-400">{c.email}</p>
                      )}
                      {c.telefono && (
                        <p className="text-xs text-bark-400">{c.telefono}</p>
                      )}
                    </div>
                    <NivelBadge nivel={nivel} size="sm" />
                  </div>

                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-bark-100 bg-white px-3 py-2 shadow-sm">
                    <HuellitaIcon
                      size={18}
                      className="shrink-0 text-[#FB8500] drop-shadow-[0_1px_0_rgba(255,255,255,1)]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-black tabular-nums text-[#FB8500] [text-shadow:0_1px_0_rgb(255_255_255),0_0_20px_rgba(255_255_255,0.75)]">
                        {formatNumber(c.saldoHuellitas)}
                        <span className="ml-1 text-xs font-semibold text-bark-600">
                          / {formatARS(valorPesos)}
                        </span>
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-bark-400">
                        {prog.nivelSiguiente
                          ? `−${formatNumber(prog.huellitasFaltantes)} para ${prog.nivelSiguiente.nombre}`
                          : "Rango máximo"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSeleccionado(c)}
                      className="btn-primary inline-flex items-center gap-1.5 text-xs"
                    >
                      <Plus size={13} /> Sumar Huellitas
                    </button>
                    <button
                      type="button"
                      onClick={() => setCanjeCliente(c)}
                      className="btn-ghost inline-flex items-center gap-1.5 text-xs"
                    >
                      <Gift size={13} /> Canjear premio
                    </button>
                    <Link
                      href={`/admin/scan/${c.id}`}
                      className="btn-ghost inline-flex items-center gap-1.5 text-xs"
                    >
                      <ScanLine size={13} /> Ficha
                    </Link>
                    <Link
                      href={`/admin/nueva-venta?cliente=${c.id}`}
                      className="btn-ghost inline-flex items-center gap-1.5 text-xs"
                    >
                      Caja <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de asignar huellitas */}
      {seleccionado && (
        <AsignarHuellitasModal
          cliente={seleccionado}
          montoParaUnaHuellita={montoParaUnaHuellita}
          valorMonetarioHuellita={valorMonetarioHuellita}
          onClose={() => setSeleccionado(null)}
          onSuccess={(actualizado) => {
            setResultados((prev) =>
              prev.map((c) => (c.id === actualizado.id ? actualizado : c))
            );
          }}
        />
      )}

      {canjeCliente && (
        <CanjeManualModal
          cliente={canjeCliente}
          premios={premios}
          onClose={() => setCanjeCliente(null)}
          onSuccess={() => {
            void fetch(
              `/api/admin/clientes/buscar?q=${encodeURIComponent(canjeCliente.email ?? canjeCliente.id)}`,
              { cache: "no-store" }
            )
              .then((r) => r.json())
              .then((data: { ok: boolean; clientes?: ClienteResumen[] }) => {
                if (data.ok && data.clientes?.[0]) {
                  const act = data.clientes[0];
                  setResultados((prev) =>
                    prev.map((c) => (c.id === act.id ? act : c))
                  );
                }
              })
              .catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}
