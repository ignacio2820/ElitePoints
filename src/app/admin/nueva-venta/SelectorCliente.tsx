"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Search, User, X } from "lucide-react";
import { esCodigoClienteValido } from "@/lib/huellitas/codigosClientes";
import type { ClienteResumen } from "@/lib/huellitas/clientesService";
import { formatNumber } from "@/lib/utils";

/**
 * Selector de cliente para la caja registradora.
 *
 * UX:
 *  - El cajero puede tipear el código corto del cliente ("ABC-123") y se
 *    resuelve instantáneamente sin scrollear.
 *  - Si tipea texto libre (nombre, email, teléfono), aparece una lista
 *    de sugerencias en tiempo real.
 *  - Una vez elegido, el cliente se muestra como un "chip" con su nombre,
 *    código corto y saldo actual; el cajero puede cambiarlo con un click.
 *
 * Se comunica con el padre mediante `onChange(clienteId)`. No expone el
 * ID interno de Firestore al cajero — sólo el código corto bonito.
 */

interface Props {
  /** ID inicial preseleccionado (viene del query param `?cliente=...`). */
  clienteIdInicial?: string;
  /** Último escaneo QR (t único para reinyectar el mismo cliente). */
  escaneoQr?: { id: string; t: number } | null;
  /** ID que mantiene el padre; si queda vacío, se limpia el chip (evita UI desincronizada). */
  clienteIdEnFormulario?: string;
  onChange: (clienteId: string) => void;
}

export function SelectorCliente({
  clienteIdInicial,
  escaneoQr,
  clienteIdEnFormulario,
  onChange
}: Props) {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<ClienteResumen[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [seleccionado, setSeleccionado] = useState<ClienteResumen | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Resolver el inicial si vino vía URL (?cliente=...)
  useEffect(() => {
    if (!clienteIdInicial) return;
    let cancelado = false;
    (async () => {
      try {
        const r = await fetch(
          `/api/admin/clientes/buscar?q=${encodeURIComponent(clienteIdInicial)}`,
          { cache: "no-store" }
        );
        const data = (await r.json()) as {
          ok: boolean;
          clientes?: ClienteResumen[];
        };
        if (cancelado) return;
        const hit = (data.clientes ?? []).find((c) => c.id === clienteIdInicial);
        if (hit) {
          setSeleccionado(hit);
          onChange(hit.id);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteIdInicial]);

  useEffect(() => {
    if (!escaneoQr?.id?.trim()) return;
    const id = escaneoQr.id.trim();
    let cancelado = false;
    (async () => {
      try {
        const r = await fetch(`/api/admin/clientes/${encodeURIComponent(id)}`, {
          cache: "no-store",
          credentials: "same-origin"
        });
        const data = (await r.json()) as {
          ok?: boolean;
          cliente?: ClienteResumen;
        };
        if (cancelado || !data.ok || !data.cliente) return;
        setSeleccionado(data.cliente);
        onChange(data.cliente.id);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelado = true;
    };
    // escaneoQr.t dispara cada nuevo escaneo
  }, [escaneoQr?.t, escaneoQr?.id, onChange]);

  useEffect(() => {
    if (clienteIdEnFormulario === undefined) return;
    if (clienteIdEnFormulario.trim()) return;
    setSeleccionado(null);
    setQ("");
    setResultados([]);
    setOpen(false);
    setError(null);
  }, [clienteIdEnFormulario]);

  // Cerrar el dropdown al click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Detección rápida: ¿la query parece un código corto?
  const pareceCodigo = useMemo(() => esCodigoClienteValido(q), [q]);

  // Búsqueda en vivo
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setError(null);
    if (!q.trim()) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      try {
        // Si parece código corto, hacemos lookup directo (más rápido y exacto)
        if (esCodigoClienteValido(q)) {
          const r = await fetch(
            `/api/admin/clientes/lookup?q=${encodeURIComponent(q)}`,
            { cache: "no-store" }
          );
          const data = (await r.json()) as {
            ok: boolean;
            cliente?: ClienteResumen;
            reason?: string;
          };
          if (data.ok && data.cliente) {
            setResultados([data.cliente]);
          } else {
            setResultados([]);
            setError("No encontramos un cliente con ese código.");
          }
        } else {
          const r = await fetch(
            `/api/admin/clientes/buscar?q=${encodeURIComponent(q)}`,
            { cache: "no-store" }
          );
          const data = (await r.json()) as {
            ok: boolean;
            clientes?: ClienteResumen[];
          };
          setResultados(data.clientes ?? []);
        }
      } catch {
        setResultados([]);
        setError("Error de red al buscar.");
      } finally {
        setBuscando(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  function elegir(c: ClienteResumen) {
    setSeleccionado(c);
    setQ("");
    setOpen(false);
    setResultados([]);
    onChange(c.id);
  }

  function limpiar() {
    setSeleccionado(null);
    setQ("");
    setResultados([]);
    onChange("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Si está seleccionado, mostramos el chip
  if (seleccionado) {
    return (
      <div className="rounded-2xl border border-bark-100 bg-cream-50/80 p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white font-display text-lg font-semibold text-bark-600 ring-1 ring-bark-100">
              {seleccionado.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-display text-base font-semibold text-bark-800">
                <CheckCircle2 size={16} className="text-emerald-600" />
                {seleccionado.nombre}
              </p>
              {seleccionado.codigoCliente && (
                <p className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-bark-200 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-bark-600">
                  Código {seleccionado.codigoCliente}
                </p>
              )}
              <p className="mt-1 text-xs text-bark-500">
                Saldo:{" "}
                <span className="font-black text-[#FB8500] [text-shadow:0_1px_0_rgb(255_255_255)]">
                  {formatNumber(seleccionado.saldoHuellitas)} Huellitas
                </span>
                {seleccionado.email && (
                  <>
                    {" · "}
                    <span className="text-bark-400">
                      {seleccionado.email}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={limpiar}
            className="rounded-full p-1.5 text-bark-400 transition hover:bg-cream-100 hover:text-bark-700"
            title="Cambiar cliente"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-2 flex items-center gap-2">
        <User size={16} className="text-bark-400" />
        <span className="text-xs font-semibold uppercase tracking-widest text-bark-400">
          Cliente
        </span>
      </label>
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bark-400"
        />
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Código del cliente (ABC-123) o nombre / email / teléfono…"
          autoComplete="off"
          className={`w-full rounded-xl border bg-cream-50 py-3 pl-11 pr-10 text-sm text-bark-700 placeholder-bark-400 outline-none transition focus:ring-2 ${
            pareceCodigo
              ? "border-amber-400 font-mono uppercase tracking-wider focus:border-amber-300 focus:ring-amber-400/30"
              : "border-bark-100 focus:border-bark-400 focus:ring-bark-400/20"
          }`}
        />
        {buscando && (
          <Loader2
            size={16}
            className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-bark-400"
          />
        )}
        {!buscando && q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-bark-400 hover:bg-cream-100 hover:text-bark-600"
            title="Limpiar"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-bark-400">
        Pedile al cliente su <span className="font-medium text-bark-600">código corto</span>{" "}
        (lo ve en su pantalla de "Mi cuenta"), o buscalo por nombre.
      </p>

      {open && q.trim() && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-bark-100 bg-white shadow-2xl shadow-bark-900/10">
          {resultados.length === 0 && !buscando && (
            <div className="p-4 text-center text-sm text-bark-400">
              {error ?? "Sin resultados"}
            </div>
          )}
          {resultados.length > 0 && (
            <ul className="max-h-72 overflow-y-auto">
              {resultados.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => elegir(c)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-cream-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream-100 font-display text-sm font-semibold text-bark-600">
                      {c.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-bark-700">
                        {c.nombre}
                      </p>
                      <p className="truncate text-xs text-bark-400">
                        {c.codigoCliente && (
                          <span className="font-mono text-bark-500">
                            {c.codigoCliente}
                          </span>
                        )}
                        {c.codigoCliente && (c.email || c.telefono) && " · "}
                        {c.email || c.telefono || "—"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-black tabular-nums text-[#FB8500] [text-shadow:0_1px_0_rgb(255_255_255)]">
                      {formatNumber(c.saldoHuellitas)}{" "}
                      <span className="font-semibold text-bark-500">Huellitas</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
