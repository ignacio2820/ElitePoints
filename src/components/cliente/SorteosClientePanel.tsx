"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles, Ticket, Trophy, Zap } from "lucide-react";
import { CountdownSorteo } from "@/components/sorteos/CountdownSorteo";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import {
  COSTO_BOOST_DUPLICAR,
  COSTO_BOOST_TRIPLICAR,
  PESO_DUPLICAR,
  PESO_TRIPLICAR
} from "@/lib/huellitas/sorteosTypes";
import { formatNumber } from "@/lib/utils";

type SorteoVista = {
  id?: string;
  premio: string;
  descripcion: string;
  imagen?: string;
  fechaHoraFin: string;
  estado: string;
  nivelMinimo: string;
  miPeso: number;
  elegible: boolean;
  totalPesos: number;
  ganadorId?: string | null;
  ganadorNombre?: string | null;
  ganadorSoyYo?: boolean;
};

type Props = {
  saldoInicial: number;
  onSaldoChange?: (nuevo: number) => void;
};

export function SorteosClientePanel({ saldoInicial, onSaldoChange }: Props) {
  const [sorteos, setSorteos] = useState<SorteoVista[]>([]);
  const [saldo, setSaldo] = useState(saldoInicial);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boostId, setBoostId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/cliente/sorteos", { credentials: "same-origin" });
      const data = (await res.json()) as { ok: boolean; sorteos?: SorteoVista[] };
      if (data.ok && data.sorteos) setSorteos(data.sorteos);
    } catch {
      setError("No pudimos cargar los sorteos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const comprarBoost = async (sorteoId: string, tipo: "duplicar" | "triplicar") => {
    setBoostId(`${sorteoId}-${tipo}`);
    setError(null);
    try {
      const res = await fetch("/api/cliente/sorteos/boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sorteoId, tipo })
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        saldoFinal?: number;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudo aplicar el boost.");
        return;
      }
      if (typeof data.saldoFinal === "number") {
        setSaldo(data.saldoFinal);
        onSaldoChange?.(data.saldoFinal);
      }
      await cargar();
    } catch {
      setError("Error de conexión.");
    } finally {
      setBoostId(null);
    }
  };

  const activos = sorteos.filter((s) => s.estado === "activo");
  const terminados = sorteos.filter((s) => s.estado === "terminado");

  if (cargando) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-terracotta-500" size={28} />
      </div>
    );
  }

  if (sorteos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-bark-200 bg-cream-50 p-8 text-center">
        <Sparkles className="mx-auto text-bark-300" size={32} />
        <p className="mt-3 font-display text-lg font-semibold text-bark-700">
          No hay sorteos activos
        </p>
        <p className="mt-1 text-sm text-bark-500">
          Cuando tu local lance un sorteo, lo vas a ver acá.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      {activos.length > 0 ? (
        <div className="space-y-6">
          <div className="px-1">
            <h2 className="font-display text-lg font-semibold tracking-tight text-bark-700">
              Sorteos activos
            </h2>
            <p className="mt-1 text-sm text-bark-500">
              Más chances = más peso en el sorteo. Tu saldo:{" "}
              <span className="inline-flex items-center gap-1 font-semibold text-bark-700">
                <HuellitaIcon size={14} />
                {formatNumber(saldo)}
              </span>
            </p>
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {activos.map((s) => {
            const inscripto = s.miPeso > 0;
            const puedeBoost = inscripto && s.elegible;
            const prob =
              s.totalPesos > 0 && inscripto
                ? ((s.miPeso / s.totalPesos) * 100).toFixed(1)
                : "0";

            return (
              <article
                key={s.id}
                className="overflow-hidden rounded-3xl border border-bark-100 bg-white shadow-soft"
              >
                {s.imagen ? (
                  <div className="relative aspect-[2/1] w-full bg-bark-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.imagen}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[3/1] items-center justify-center bg-gradient-to-br from-bark-700 to-bark-800">
                    <GiftPlaceholder />
                  </div>
                )}

                <div className="space-y-4 p-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-terracotta-500">
                      Sorteo en curso
                    </p>
                    <h3 className="mt-1 font-display text-xl font-semibold text-bark-700">
                      {s.premio}
                    </h3>
                    {s.descripcion ? (
                      <p className="mt-2 text-sm leading-relaxed text-bark-500">
                        {s.descripcion}
                      </p>
                    ) : null}
                  </div>

                  <CountdownSorteo fechaHoraFin={s.fechaHoraFin} />

                  {!s.elegible ? (
                    <p className="rounded-xl bg-cream-100 px-4 py-3 text-sm text-bark-600">
                      Tu nivel de lealtad aún no alcanza para este sorteo. Seguí sumando
                      huellitas históricas en el local.
                    </p>
                  ) : inscripto ? (
                    <div className="rounded-xl border border-terracotta-100 bg-terracotta-50/40 px-4 py-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-bark-700">
                        <Ticket size={16} className="text-terracotta-500" />
                        Tus chances: peso {s.miPeso} (~{prob}% del pozo)
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-bark-500">
                      Cumplís el nivel, pero no estás en la lista de participantes. Contactá
                      al local si creés que es un error.
                    </p>
                  )}

                  {puedeBoost ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <BoostButton
                        label="Duplicar chances"
                        sub={`+1 ticket · peso ${PESO_DUPLICAR}`}
                        costo={COSTO_BOOST_DUPLICAR}
                        disabled={s.miPeso >= PESO_DUPLICAR || saldo < COSTO_BOOST_DUPLICAR}
                        loading={boostId === `${s.id}-duplicar`}
                        onClick={() => s.id && comprarBoost(s.id, "duplicar")}
                      />
                      <BoostButton
                        label="Triplicar chances"
                        sub={`+2 tickets · peso ${PESO_TRIPLICAR}`}
                        costo={COSTO_BOOST_TRIPLICAR}
                        disabled={s.miPeso >= PESO_TRIPLICAR || saldo < COSTO_BOOST_TRIPLICAR}
                        loading={boostId === `${s.id}-triplicar`}
                        onClick={() => s.id && comprarBoost(s.id, "triplicar")}
                        destacado
                      />
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {terminados.length > 0 ? (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold tracking-tight text-bark-700">
            Sorteos finalizados
          </h2>
          {terminados.map((s) => (
            <article
              key={s.id}
              className="rounded-2xl border border-bark-100 bg-cream-50/80 p-5"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-bark-400">
                Sorteo terminado
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold text-bark-700">
                {s.premio}
              </h3>
              {s.ganadorSoyYo ? (
                <p className="mt-3 rounded-xl border border-terracotta-200 bg-terracotta-50 px-4 py-3 text-sm font-semibold text-terracotta-800">
                  <Trophy size={16} className="mr-1.5 inline" />
                  ¡Felicitaciones! Ganaste este sorteo. Revisá tu email con instrucciones para
                  retirar el premio en el local.
                </p>
              ) : s.ganadorNombre || s.ganadorId ? (
                <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-bark-600">
                  <Trophy size={14} className="text-terracotta-500" />
                  Ganador: {s.ganadorNombre ?? "Participante del local"}
                </p>
              ) : (
                <p className="mt-2 text-sm text-bark-500">Sorteo cerrado sin ganador registrado.</p>
              )}
              <p className="mt-2 text-xs text-bark-400">
                Participaste con peso {s.miPeso}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function GiftPlaceholder() {
  return <Sparkles className="text-terracotta-400/60" size={40} />;
}

function BoostButton({
  label,
  sub,
  costo,
  disabled,
  loading,
  onClick,
  destacado
}: {
  label: string;
  sub: string;
  costo: number;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  destacado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={
        destacado
          ? "flex flex-col items-start rounded-2xl bg-gradient-to-r from-bark-600 to-terracotta-500 px-4 py-3 text-left text-white shadow-soft transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          : "flex flex-col items-start rounded-2xl border border-bark-200 bg-white px-4 py-3 text-left transition hover:border-terracotta-200 hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Zap size={14} />
        )}
        {label}
      </span>
      <span
        className={
          destacado ? "mt-1 text-xs text-white/85" : "mt-1 text-xs text-bark-500"
        }
      >
        {sub} · {costo} huellitas
      </span>
    </button>
  );
}
