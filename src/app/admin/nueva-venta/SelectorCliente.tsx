"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Search, User, X } from "lucide-react";
import { esCodigoClienteValido } from "@/lib/huellitas/codigosClientes";
import { esEntradaEscannerRapida } from "@/lib/huellitas/escannerCliente";
import type { ClienteResumen } from "@/lib/huellitas/clientesService";
import { formatNumber } from "@/lib/utils";

/** Limpia saltos de línea que envía el lector láser al final del código. */
function sanitizarEntradaEscanner(valor: string): string {
  return valor.replace(/[\r\n\t]/g, "").trim();
}

interface Props {
  clienteIdInicial?: string;
  escaneoQr?: { id: string; t: number } | null;
  clienteIdEnFormulario?: string;
  onChange: (clienteId: string) => void;
  /** Tras asociar cliente (escáner o selección); el padre enfoca el monto. */
  onClienteListo?: () => void;
}

export function SelectorCliente({
  clienteIdInicial,
  escaneoQr,
  clienteIdEnFormulario,
  onChange,
  onClienteListo
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
  const ultimaAplicacionRef = useRef<string>("");

  const aplicarClienteDirecto = useCallback(
    (c: ClienteResumen) => {
      const clave = `${c.id}:${c.codigoCliente ?? ""}`;
      if (ultimaAplicacionRef.current === clave) return;
      ultimaAplicacionRef.current = clave;

      setSeleccionado(c);
      setQ("");
      setOpen(false);
      setResultados([]);
      setError(null);
      onChange(c.id);
      onClienteListo?.();
    },
    [onChange, onClienteListo]
  );

  const resolverPorLookup = useCallback(
    async (entrada: string): Promise<ClienteResumen | null> => {
      const r = await fetch(
        `/api/admin/clientes/lookup?q=${encodeURIComponent(entrada)}`,
        { cache: "no-store", credentials: "same-origin" }
      );
      const data = (await r.json()) as {
        ok: boolean;
        cliente?: ClienteResumen;
      };
      return data.ok && data.cliente ? data.cliente : null;
    },
    []
  );

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
        if (hit) aplicarClienteDirecto(hit);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [clienteIdInicial, aplicarClienteDirecto]);

  useEffect(() => {
    if (!escaneoQr?.id?.trim()) return;
    const ref = sanitizarEntradaEscanner(escaneoQr.id);
    let cancelado = false;
    (async () => {
      try {
        const cliente = await resolverPorLookup(ref);
        if (cancelado || !cliente) return;
        aplicarClienteDirecto(cliente);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [escaneoQr?.t, escaneoQr?.id, aplicarClienteDirecto, resolverPorLookup]);

  useEffect(() => {
    if (clienteIdEnFormulario === undefined) return;
    if (clienteIdEnFormulario.trim()) return;
    setSeleccionado(null);
    setQ("");
    setResultados([]);
    setOpen(false);
    setError(null);
    ultimaAplicacionRef.current = "";
  }, [clienteIdEnFormulario]);

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

  const qSanitizada = sanitizarEntradaEscanner(q);
  const pareceCodigo = useMemo(() => esCodigoClienteValido(qSanitizada), [qSanitizada]);
  const esEscanner = useMemo(
    () => pareceCodigo || esEntradaEscannerRapida(qSanitizada),
    [pareceCodigo, qSanitizada]
  );

  const ejecutarBusqueda = useCallback(
    async (entrada: string) => {
      const texto = sanitizarEntradaEscanner(entrada);
      if (!texto) return;

      setBuscando(true);
      setError(null);

      try {
        if (esEntradaEscannerRapida(texto)) {
          const cliente = await resolverPorLookup(texto);
          if (cliente) {
            aplicarClienteDirecto(cliente);
            return;
          }
          setResultados([]);
          setOpen(false);
          setError("No encontramos un cliente con ese código.");
          return;
        }

        const r = await fetch(
          `/api/admin/clientes/buscar?q=${encodeURIComponent(texto)}`,
          { cache: "no-store" }
        );
        const data = (await r.json()) as {
          ok: boolean;
          clientes?: ClienteResumen[];
        };
        const lista = data.clientes ?? [];
        setResultados(lista);
        setOpen(true);
        if (lista.length === 0) {
          setError("Sin resultados");
        }
      } catch {
        setResultados([]);
        setOpen(false);
        setError("Error de red al buscar.");
      } finally {
        setBuscando(false);
      }
    },
    [aplicarClienteDirecto, resolverPorLookup]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setError(null);

    if (!qSanitizada) {
      setResultados([]);
      setBuscando(false);
      return;
    }

    if (seleccionado) return;

    const delay = esEscanner ? 0 : 200;
    setBuscando(delay > 0);

    debounceRef.current = setTimeout(() => {
      void ejecutarBusqueda(qSanitizada);
    }, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [qSanitizada, esEscanner, ejecutarBusqueda, seleccionado]);

  function elegir(c: ClienteResumen) {
    aplicarClienteDirecto(c);
  }

  function limpiar() {
    setSeleccionado(null);
    setQ("");
    setResultados([]);
    onChange("");
    ultimaAplicacionRef.current = "";
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function onInputChange(valor: string) {
    setQ(sanitizarEntradaEscanner(valor));
    if (!seleccionado) setOpen(!esCodigoClienteValido(sanitizarEntradaEscanner(valor)));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void ejecutarBusqueda(qSanitizada);
  }

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
                  {formatNumber(seleccionado.saldoHuellitas)} Puntos
                </span>
                {seleccionado.email && (
                  <>
                    {" · "}
                    <span className="text-bark-400">{seleccionado.email}</span>
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
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (!esEscanner) setOpen(true);
          }}
          placeholder="Escaneá credencial o código (ej. YMS-Q6Y)…"
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
        Pasá el lector en este campo: al reconocer el código, el cursor salta solo
        al monto de la venta.
      </p>

      {open && q.trim() && !esEscanner && (
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
                      <span className="font-semibold text-bark-500">Puntos</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && esEscanner && !buscando && qSanitizada && (
        <p className="mt-2 text-sm text-amber-800" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
