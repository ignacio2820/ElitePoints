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
    <div className="mx-auto max-w-3xl">
        {/* Encabezado */}
        <div className="mb-8 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-[#FFFCF4] via-cream-50 to-cream-100/80 p-6 shadow-soft ring-1 ring-amber-100/60">
          <div className="flex items-start justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700/80">
              <ScanLine size={12} />
              Caja registradora
            </span>
            <h1 className="mt-3 font-display text-4xl font-semibold text-bark-700">
              Nueva venta
            </h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {nombreLocal} ·{" "}
              <span className="font-medium text-bark-600">
                1 Huellita cada {formatARS(montoParaUnaHuellita)}
              </span>
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-amber-200/70 bg-cream-50/90 px-3 py-2 text-xs text-bark-500 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
            {configFuente === "firestore" ? "Conectado a Firestore" : "Modo demo"}
          </div>
          </div>
        </div>

        {configFuente === "fallback" && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">
                Configuración cargada en modo demo
              </p>
              <p className="mt-1 text-amber-800/90">
                No pude leer la configuración de <code>{localId}</code> desde
                Firestore. Verificá que pegaste la private key real en{" "}
                <code>.env.local</code> y que corriste{" "}
                <code className="rounded bg-white px-1.5 py-0.5 ring-1 ring-amber-100">
                  npm run seed
                </code>
                .
              </p>
              {configError && (
                <p className="mt-2 text-xs text-amber-800/70">
                  Detalle: {configError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Card principal */}
        <div className="rounded-3xl border border-bark-100/80 bg-white/90 p-7 shadow-soft">
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
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-bark-500">
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
                      className="w-full rounded-xl input-elegant py-4 pl-9 pr-4 text-2xl font-semibold outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
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
                <details className="group rounded-xl border border-bark-100 bg-cream-50 p-4">
                  <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-bark-600 transition group-open:text-bark-700">
                    <span className="flex items-center gap-2">
                      <HuellitaIcon size={14} className="text-bark-500" />
                      Canjear huellitas en esta venta (opcional)
                    </span>
                    <span className="text-xs text-bark-400">
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
                      className="w-full rounded-lg input-elegant py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                    <p className="mt-2 text-xs text-bark-400">
                      El cliente puede canjear sus huellitas vigentes para
                      descontar parte del total. El sistema valida saldo y tope
                      configurado.
                    </p>
                  </div>
                </details>

                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-rose-900">
                        No se pudo registrar la venta
                      </p>
                      <p className="mt-1 text-rose-800/90">{error}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isValid || enviando}
                  className="btn-primary flex w-full items-center justify-center gap-2 py-4 text-base"
                >
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

        <p className="mt-6 text-center text-xs text-[color:var(--muted)]">
          Local: <span className="text-bark-500">{localId}</span> · Las
          huellitas se acreditan al instante en el saldo del cliente.
        </p>
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
        {icon && <span className="text-bark-400">{icon}</span>}
        <span className="text-xs font-semibold uppercase tracking-widest text-bark-400">
          {label}
        </span>
      </div>
      {children}
      {hint && <p className="mt-2 text-xs text-bark-400">{hint}</p>}
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
      className={`rounded-2xl border p-5 shadow-soft transition-all ${
        huellitas > 0
          ? "border-amber-200/80 bg-cream-50/90 ring-1 ring-amber-100"
          : "border-bark-100 bg-cream-50/70"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-bark-400">
            Ganará
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`font-display text-5xl font-bold tabular-nums ${
                huellitas > 0 ? "text-amber-600" : "text-bark-300"
              }`}
            >
              {formatNumber(huellitas)}
            </span>
            <span
              className={`text-lg font-medium ${
                huellitas > 0 ? "text-amber-700" : "text-bark-300"
              }`}
            >
              Huellitas
            </span>
          </div>
          {huellitas > 0 && (
            <p className="mt-2 text-sm text-amber-800/80">
              Equivalen a{" "}
              <span className="font-semibold text-amber-800">
                {formatARS(valorEnPesos)}
              </span>{" "}
              de descuento futuro
            </p>
          )}
        </div>
        <HuellitasFlotantes huellitas={huellitas} />
      </div>
      {muestraResto && (
        <div className="mt-4 flex items-center gap-2 border-t border-bark-100 pt-3 text-xs text-bark-400">
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
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-bark-200 text-bark-300">
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
          className="absolute text-amber-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
          style={{
            top: `${(i % 2) * 18 + (i % 3) * 6}px`,
            left: `${i * 12}px`,
            transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (10 + i * 3)}deg)`,
            opacity: 0.6 + i * 0.08
          }}
        />
      ))}
      {huellitas > 5 && (
        <span className="absolute -bottom-1 right-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
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
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 size={22} />
        </div>
        <div>
          <p className="font-semibold text-emerald-900">¡Venta registrada!</p>
          <p className="text-xs text-emerald-800/80">
            ID: <code className="font-mono">{resultado.ventaId}</code>
          </p>
        </div>
      </div>

      {/* Saldo destacado */}
      <div className="rounded-2xl border-2 border-bark-100 bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-bark-600">
          Nuevo saldo del cliente
        </p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <HuellitaIcon
            size={36}
            className="text-[#FB8500] drop-shadow-[0_1px_0_rgba(255,255,255,1)]"
          />
          <span className="font-display text-6xl font-black tabular-nums text-[#FB8500] [text-shadow:0_1px_0_rgb(255_255_255),0_0_28px_rgba(255_255_255,0.95)]">
            {formatNumber(resultado.saldoFinal ?? 0)}
          </span>
        </div>
        <p className="mt-1 text-sm text-bark-600">
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
        <div className="flex items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700">
            <Crown size={22} />
          </div>
          <div>
            <p className="font-semibold text-purple-900">¡Subió de nivel!</p>
            <p className="text-sm text-purple-800/80">
              {nivelAnterior?.nombre ?? "—"} →{" "}
              <span className="font-bold text-purple-900">
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
            <div className="flex items-center gap-3 rounded-2xl border border-pink-200 bg-pink-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-700">
                <Cake size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-pink-900">
                  ¡Bono Cumpleaños aplicado!
                </p>
                <p className="text-sm text-pink-800/80">
                  Multiplicador ×
                  {(
                    resultado.bonificaciones.cumpleanos.multiplicador ?? 2
                  ).toFixed(0)}{" "}
                  ·{" "}
                  <span className="font-bold text-pink-900">
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
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Gift size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900">
                  ¡Bono Primera Compra acreditado!
                </p>
                <p className="text-sm text-amber-800/80">
                  Lote de bienvenida:{" "}
                  <span className="font-bold text-amber-900">
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
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="font-semibold text-sky-900">
            🎁 Activación de referido
          </p>
          <p className="mt-1 text-sm text-sky-800/80">
            Bienvenida acreditada:{" "}
            <span className="font-bold text-sky-900">
              +{formatNumber(resultado.referidoActivado.bonusBienvenida)}
            </span>{" "}
            · Premio al referente:{" "}
            <span className="font-bold text-sky-900">
              +{formatNumber(resultado.referidoActivado.bonusReferente)}
            </span>
          </p>
        </div>
      )}

      <button
        onClick={onNuevaVenta}
        className="w-full rounded-xl border border-bark-200 bg-white py-3 text-sm font-semibold text-bark-700 transition hover:border-bark-300 hover:bg-cream-50"
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
          ? "border-amber-200 bg-amber-50/80"
          : "border-bark-100 bg-cream-50/70"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-bark-400">
        {label}
      </p>
      <p
        className={`mt-1 font-display text-xl font-semibold tabular-nums ${
          accent ? "text-amber-700" : "text-bark-700"
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
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-bark-200 border-t-bark-600"
      role="status"
      aria-label="cargando"
    />
  );
}
