"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Gift, Loader2, RefreshCw } from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { NivelBadge } from "@/components/NivelBadge";
import { ModalEnviarDisculpa } from "@/components/admin/encuestas/ModalEnviarDisculpa";
import type { AlertaEncuestaAdmin } from "@/lib/huellitas/encuestasAlertasService";
import { formatNumber } from "@/lib/utils";

function formatearFecha(iso: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface Props {
  onCountChange?: (count: number) => void;
}

export function AlertasEncuestasPanel({ onCountChange }: Props = {}) {
  const [alertas, setAlertas] = useState<AlertaEncuestaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disculpaAlerta, setDisculpaAlerta] = useState<AlertaEncuestaAdmin | null>(
    null
  );

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/encuestas/alertas", {
        credentials: "same-origin",
        cache: "no-store"
      });
      const data = (await res.json()) as {
        ok: boolean;
        alertas?: AlertaEncuestaAdmin[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudieron cargar las alertas.");
        setAlertas([]);
        return;
      }
      const lista = data.alertas ?? [];
      setAlertas(lista);
      onCountChange?.(lista.length);
    } catch {
      setError("Error de conexión al cargar alertas.");
      setAlertas([]);
    } finally {
      setCargando(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-bark-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando alertas…
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-2 text-sm text-red-900">
          <AlertTriangle size={18} className="shrink-0 text-red-600" />
          <span>
            {alertas.length === 0
              ? "No hay alertas pendientes"
              : `${alertas.length} alerta${alertas.length === 1 ? "" : "s"} sin resolver`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void cargar()}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50"
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {alertas.length === 0 && !error ? (
        <div className="surface-card rounded-2xl p-10 text-center">
          <p className="text-bark-600">
            Cuando un cliente califique con 1 o 2 huellitas, la alerta aparecerá
            aquí para que puedas recuperarlo.
          </p>
        </div>
      ) : (
        <div className="surface-card overflow-hidden rounded-2xl ring-1 ring-bark-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-bark-100 bg-cream-50/80 text-xs font-semibold uppercase tracking-wide text-bark-500">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Nivel</th>
                  <th className="px-4 py-3">Puntuación</th>
                  <th className="px-4 py-3">Comentario</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {alertas.map((a) => (
                  <tr
                    key={a.encuestaId}
                    className="border-b border-bark-50 last:border-0 hover:bg-cream-50/50"
                  >
                    <td className="px-4 py-3 font-semibold text-bark-800">
                      {a.nombreCliente}
                      <span className="mt-0.5 block text-xs font-normal text-bark-400">
                        {formatNumber(a.huellitasHistoricas)} históricas
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <NivelBadge nivel={a.nivel} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-0.5 text-red-700 font-bold">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <HuellitaIcon
                            key={i}
                            size={18}
                            filled={i < a.puntuacion}
                            className={
                              i < a.puntuacion ? "text-red-500" : "text-bark-200"
                            }
                          />
                        ))}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-4 py-3 text-bark-600">
                      {a.comentario ? (
                        <span className="line-clamp-2" title={a.comentario}>
                          {a.comentario}
                        </span>
                      ) : (
                        <span className="italic text-bark-400">Sin comentario</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-bark-500">
                      {formatearFecha(a.creadoEn)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDisculpaAlerta(a)}
                        className="btn-primary inline-flex text-xs py-2 px-3"
                      >
                        <Gift size={14} />
                        Enviar disculpa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {disculpaAlerta ? (
        <ModalEnviarDisculpa
          alerta={disculpaAlerta}
          onClose={() => setDisculpaAlerta(null)}
          onSuccess={() => void cargar()}
        />
      ) : null}
    </section>
  );
}

function div({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
