"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Cake,
  CheckCircle2,
  Crown,
  Gift,
  Receipt,
  ScanLine,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import type { NivelLealtad } from "@/lib/huellitas/types";
import { formatARS, formatNumber } from "@/lib/utils";
import { SelectorCliente } from "./SelectorCliente";

interface VentaResponse {
  ok: boolean;
  error?: string;
  ventaId?: string;
  huellitasBase?: number;
  multiplicadorAplicado?: number;
  huellitasGeneradas?: number;
  huellitasCanjeadas?: number;
  descuentoCanje?: number;
  descuentoNivel?: number;
  totalCobrado?: number;
  saldoFinal?: number;
  acumuladoHistorico?: number;
  nivelId?: string;
  nivelAnterior?: string;
  subioNivel?: boolean;
  bonificaciones?: {
    cumpleanos?: {
      aplicado?: boolean;
      multiplicador?: number;
      mascotaId?: string | null;
      huellitasExtra?: number;
    };
    primeraCompra?: {
      aplicado?: boolean;
      huellitasExtra?: number;
    };
  };
  referidoActivado?: {
    referenteId: string;
    bonusReferente: number;
    bonusBienvenida: number;
    eventoId: string;
  };
}

interface Props {
  localId: string;
  nombreLocal: string;
  montoParaUnaHuellita: number;
  valorMonetarioHuellita: number;
  niveles: NivelLealtad[];
  configFuente: "firestore" | "fallback";
  configError?: string;
  clienteIdInicial?: string;
}

export function NuevaVentaForm({
  localId,
  nombreLocal,
  montoParaUnaHuellita,
  valorMonetarioHuellita,
  niveles,
  configFuente,
  configError,
  clienteIdInicial = ""
}: Props) {
  const [clienteId, setClienteId] = useState(clienteIdInicial);
  const [monto, setMonto] = useState("");
  const [huellitasACanjear, setHuellitasACanjear] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<VentaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const montoNum = Number(monto) || 0;
  const canjeNum = Number(huellitasACanjear) || 0;

  const huellitasPrevistas = useMemo(() => {
    if (montoNum <= 0 || montoParaUnaHuellita <= 0) return 0;
    return Math.floor(montoNum / montoParaUnaHuellita);
  }, [montoNum, montoParaUnaHuellita]);

  const valorEnPesos = huellitasPrevistas * valorMonetarioHuellita;
  const isValid = clienteId.trim().length > 0 && montoNum > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || enviando) return;
    setEnviando(true);
    setError(null);
    setResultado(null);
    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localId,
          clienteId: clienteId.trim(),
          totalVenta: montoNum,
          huellitasACanjear: canjeNum > 0 ? canjeNum : undefined
        })
      });
      const data: VentaResponse = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? `Error ${res.status}`);
      } else {
        setResultado(data);
        setMonto("");
        setHuellitasACanjear("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setEnviando(false);
    }
  }

  function nuevaVenta() {
    setResultado(null);
    setError(null);
    setClienteId("");
    setMonto("");
    setHuellitasACanjear("");
  }

  const nivelActualResult = niveles.find((n) => n.id === resultado?.nivelId);
  const nivelAnteriorResult = niveles.find((n) => n.id === resultado?.nivelAnterior);

  return (
    <div className="-mx-6 -my-10 min-h-[calc(100vh-72px)] bg-gradient-to-br from-zinc-950 via-zinc-900 to-black px-6 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Encabezado */}
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
              <ScanLine size={12} />
              Caja registradora
            </div>
            <h1 className="mt-3 font-display text-4xl font-semibold text-zinc-50">
              Nueva venta
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {nombreLocal} ·{" "}
              <span className="text-amber-300">
                1 Huellita cada {formatARS(montoParaUnaHuellita)}
              </span>
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
            {configFuente === "firestore" ? "Conectado a Firestore" : "Modo demo"}
          </div>
        </div>

        {configFuente === "fallback" && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-200">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-100">
                Configuración cargada en modo demo
              </p>
              <p className="mt-1 text-amber-200/80">
                No pude leer la configuración de <code>{localId}</code> desde
                Firestore. Verificá que pegaste la private key real en{" "}
                <code>.env.local</code> y que corriste{" "}
                <code className="rounded bg-zinc-900/60 px-1.5 py-0.5">
                  npm run seed
                </code>
                .
              </p>
              {configError && (
                <p className="mt-2 text-xs text-amber-200/60">
                  Detalle: {configError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Card principal */}
        <div className="relative rounded-3xl border border-amber-400/40 bg-zinc-950/80 p-1 shadow-[0_25px_70px_-20px_rgba(251,191,36,0.25)] backdrop-blur">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-amber-400/15 via-transparent to-amber-300/5" />
          <div className="rounded-[22px] border border-zinc-800/80 bg-zinc-950/90 p-7">
            {!resultado ? (
              <form onSubmit={onSubmit} className="space-y-6">
                <SelectorCliente
                  clienteIdInicial={clienteIdInicial}
                  onChange={setClienteId}
                />

                {/* Monto */}
                <FieldDark
                  label="Monto de la venta"
                  hint={`Total en pesos · canje 1 Huellita = ${formatARS(valorMonetarioHuellita)}`}
                  icon={<Receipt size={16} />}
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-amber-300">
                      $
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={1}
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-4 pl-9 pr-4 text-2xl font-semibold text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                  </div>
                </FieldDark>

                {/* Cálculo en vivo */}
                <CalculoEnVivo
                  monto={montoNum}
                  huellitas={huellitasPrevistas}
                  valorEnPesos={valorEnPesos}
                  montoParaUnaHuellita={montoParaUnaHuellita}
                />

                {/* Canje opcional */}
                <details className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-zinc-300 transition group-open:text-amber-300">
                    <span className="flex items-center gap-2">
                      <HuellitaIcon size={14} className="text-amber-300" />
                      Canjear huellitas en esta venta (opcional)
                    </span>
                    <span className="text-xs text-zinc-500">
                      {canjeNum > 0
                        ? `−${formatARS(canjeNum * valorMonetarioHuellita)}`
                        : "Ninguna"}
                    </span>
                  </summary>
                  <div className="mt-4">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={huellitasACanjear}
                      onChange={(e) => setHuellitasACanjear(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                    <p className="mt-2 text-xs text-zinc-500">
                      El cliente puede canjear sus huellitas vigentes para
                      descontar parte del total. El sistema valida saldo y tope
                      configurado.
                    </p>
                  </div>
                </details>

                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-rose-100">
                        No se pudo registrar la venta
                      </p>
                      <p className="mt-1 text-rose-200/80">{error}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isValid || enviando}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 py-4 text-base font-bold text-zinc-900 shadow-[0_8px_24px_-8px_rgba(251,191,36,0.6)] transition hover:shadow-[0_12px_32px_-8px_rgba(251,191,36,0.7)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {enviando ? (
                      <>
                        <Spinner /> Registrando...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Registrar venta · Sumar {formatNumber(huellitasPrevistas)}{" "}
                        Huellitas
                      </>
                    )}
                  </span>
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </button>
              </form>
            ) : (
              <ResultadoVenta
                resultado={resultado}
                nivelActual={nivelActualResult}
                nivelAnterior={nivelAnteriorResult}
                onNuevaVenta={nuevaVenta}
              />
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Local: <span className="text-zinc-400">{localId}</span> · Las
          huellitas se acreditan al instante en el saldo del cliente.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function FieldDark({
  label,
  hint,
  icon,
  children
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2">
        {icon && <span className="text-amber-300/70">{icon}</span>}
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {label}
        </span>
      </div>
      {children}
      {hint && <p className="mt-2 text-xs text-zinc-500">{hint}</p>}
    </label>
  );
}

function CalculoEnVivo({
  monto,
  huellitas,
  valorEnPesos,
  montoParaUnaHuellita
}: {
  monto: number;
  huellitas: number;
  valorEnPesos: number;
  montoParaUnaHuellita: number;
}) {
  const restoParaSiguiente =
    monto > 0 ? montoParaUnaHuellita - (monto % montoParaUnaHuellita) : 0;
  const muestraResto =
    monto > 0 && restoParaSiguiente > 0 && restoParaSiguiente !== montoParaUnaHuellita;

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        huellitas > 0
          ? "border-amber-400/50 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent shadow-[0_0_30px_-12px_rgba(251,191,36,0.5)]"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Ganará
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`font-display text-5xl font-bold tabular-nums ${
                huellitas > 0 ? "text-amber-300" : "text-zinc-600"
              }`}
            >
              {formatNumber(huellitas)}
            </span>
            <span
              className={`text-lg font-medium ${
                huellitas > 0 ? "text-amber-200/80" : "text-zinc-600"
              }`}
            >
              Huellitas
            </span>
          </div>
          {huellitas > 0 && (
            <p className="mt-2 text-sm text-amber-200/70">
              Equivalen a{" "}
              <span className="font-semibold text-amber-200">
                {formatARS(valorEnPesos)}
              </span>{" "}
              de descuento futuro
            </p>
          )}
        </div>
        <HuellitasFlotantes huellitas={huellitas} />
      </div>
      {muestraResto && (
        <div className="mt-4 flex items-center gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
          <TrendingUp size={12} />
          Sumá {formatARS(restoParaSiguiente)} más para ganar 1 Huellita extra
        </div>
      )}
    </div>
  );
}

function HuellitasFlotantes({ huellitas }: { huellitas: number }) {
  const visibles = Math.min(huellitas, 5);
  if (visibles === 0) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-zinc-800 text-zinc-700">
        <HuellitaIcon size={28} />
      </div>
    );
  }
  return (
    <div className="relative h-16 w-20">
      {Array.from({ length: visibles }).map((_, i) => (
        <HuellitaIcon
          key={i}
          size={26}
          className="absolute text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
          style={{
            top: `${(i % 2) * 18 + (i % 3) * 6}px`,
            left: `${i * 12}px`,
            transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (10 + i * 3)}deg)`,
            opacity: 0.6 + i * 0.08
          }}
        />
      ))}
      {huellitas > 5 && (
        <span className="absolute -bottom-1 right-0 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-zinc-900">
          +{huellitas - 5}
        </span>
      )}
    </div>
  );
}

function ResultadoVenta({
  resultado,
  nivelActual,
  nivelAnterior,
  onNuevaVenta
}: {
  resultado: VentaResponse;
  nivelActual?: NivelLealtad;
  nivelAnterior?: NivelLealtad;
  onNuevaVenta: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
          <CheckCircle2 size={22} />
        </div>
        <div>
          <p className="font-semibold text-emerald-100">¡Venta registrada!</p>
          <p className="text-xs text-emerald-200/70">
            ID: <code className="font-mono">{resultado.ventaId}</code>
          </p>
        </div>
      </div>

      {/* Saldo destacado */}
      <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-amber-400/5 to-transparent p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/80">
          Nuevo saldo del cliente
        </p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <HuellitaIcon
            size={36}
            className="text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]"
          />
          <span className="font-display text-6xl font-bold text-amber-200 tabular-nums">
            {formatNumber(resultado.saldoFinal ?? 0)}
          </span>
        </div>
        <p className="mt-1 text-sm text-amber-200/70">
          Huellitas vigentes (acumulado histórico:{" "}
          {formatNumber(resultado.acumuladoHistorico ?? 0)})
        </p>
      </div>

      {/* Detalle */}
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Sumadas"
          value={`+${formatNumber(resultado.huellitasGeneradas ?? 0)}`}
          accent
        />
        <Stat
          label="Multiplicador"
          value={`${(resultado.multiplicadorAplicado ?? 1).toFixed(1)}×`}
        />
        {(resultado.huellitasCanjeadas ?? 0) > 0 && (
          <Stat
            label="Canjeadas"
            value={`−${formatNumber(resultado.huellitasCanjeadas ?? 0)}`}
          />
        )}
        {(resultado.descuentoNivel ?? 0) > 0 && (
          <Stat
            label="Descuento por nivel"
            value={formatARS(resultado.descuentoNivel ?? 0)}
          />
        )}
        <Stat
          label="Total cobrado"
          value={formatARS(resultado.totalCobrado ?? 0)}
        />
      </div>

      {/* Subió de nivel */}
      {resultado.subioNivel && nivelActual && (
        <div className="flex items-center gap-3 rounded-2xl border border-purple-400/40 bg-gradient-to-br from-purple-500/15 to-fuchsia-500/10 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-400/20 text-purple-300">
            <Crown size={22} />
          </div>
          <div>
            <p className="font-semibold text-purple-100">¡Subió de nivel!</p>
            <p className="text-sm text-purple-200/80">
              {nivelAnterior?.nombre ?? "—"} →{" "}
              <span className="font-bold text-purple-100">
                {nivelActual.nombre}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Bonificaciones especiales (cumpleaños / primera compra) */}
      {(resultado.bonificaciones?.cumpleanos?.aplicado ||
        resultado.bonificaciones?.primeraCompra?.aplicado) && (
        <div className="space-y-3">
          {resultado.bonificaciones?.cumpleanos?.aplicado && (
            <div className="flex items-center gap-3 rounded-2xl border border-pink-400/40 bg-gradient-to-br from-pink-500/15 to-rose-500/10 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-400/20 text-pink-200">
                <Cake size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-pink-100">
                  ¡Bono Cumpleaños aplicado!
                </p>
                <p className="text-sm text-pink-200/80">
                  Multiplicador ×
                  {(
                    resultado.bonificaciones.cumpleanos.multiplicador ?? 2
                  ).toFixed(0)}{" "}
                  ·{" "}
                  <span className="font-bold text-pink-100">
                    +
                    {formatNumber(
                      resultado.bonificaciones.cumpleanos.huellitasExtra ?? 0
                    )}
                  </span>{" "}
                  Huellitas extra
                </p>
              </div>
            </div>
          )}

          {resultado.bonificaciones?.primeraCompra?.aplicado && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-orange-500/10 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/20 text-amber-200">
                <Gift size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-100">
                  ¡Bono Primera Compra acreditado!
                </p>
                <p className="text-sm text-amber-200/80">
                  Lote de bienvenida:{" "}
                  <span className="font-bold text-amber-100">
                    +
                    {formatNumber(
                      resultado.bonificaciones.primeraCompra.huellitasExtra ?? 0
                    )}
                  </span>{" "}
                  Huellitas
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bonus de referido */}
      {resultado.referidoActivado && (
        <div className="rounded-2xl border border-sky-400/40 bg-gradient-to-br from-sky-500/15 to-cyan-500/10 p-4">
          <p className="font-semibold text-sky-100">
            🎁 Activación de referido
          </p>
          <p className="mt-1 text-sm text-sky-200/80">
            Bienvenida acreditada:{" "}
            <span className="font-bold text-sky-100">
              +{formatNumber(resultado.referidoActivado.bonusBienvenida)}
            </span>{" "}
            · Premio al referente:{" "}
            <span className="font-bold text-sky-100">
              +{formatNumber(resultado.referidoActivado.bonusReferente)}
            </span>
          </p>
        </div>
      )}

      <button
        onClick={onNuevaVenta}
        className="w-full rounded-xl border border-amber-400/50 bg-zinc-900 py-3 text-sm font-semibold text-amber-300 transition hover:border-amber-400 hover:bg-zinc-800"
      >
        Registrar otra venta
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        accent
          ? "border-amber-400/40 bg-amber-500/5"
          : "border-zinc-800 bg-zinc-900/60"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-1 font-display text-xl font-semibold tabular-nums ${
          accent ? "text-amber-300" : "text-zinc-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-900/30 border-t-zinc-900"
      role="status"
      aria-label="cargando"
    />
  );
}
