"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Loader2, MessageSquare, X } from "lucide-react";
import { PuntoIcon } from "@/components/PuntoIcon";
import { PREGUNTAS_ENCUESTA_IN_APP } from "@/lib/huellitas/encuestasInAppConstants";
import type { EncuestaPendienteInApp } from "@/lib/huellitas/encuestasInAppService";
import type { RespuestasEncuestaInApp } from "@/lib/huellitas/encuestasInAppTypes";
import { cn } from "@/lib/utils";

type RespuestasParciales = Partial<RespuestasEncuestaInApp>;

interface Props {
  encuesta: EncuestaPendienteInApp;
  onCerrar: () => void;
  onEnviada?: () => void;
}

export function EncuestaPostCompraPopup({
  encuesta,
  onCerrar,
  onEnviada
}: Props) {
  const [respuestas, setRespuestas] = useState<RespuestasParciales>({});
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const completo =
    Boolean(respuestas.atencion) &&
    Boolean(respuestas.tiempoEspera) &&
    Boolean(respuestas.productos);

  const setCampo = useCallback(
    <K extends keyof RespuestasEncuestaInApp>(
      key: K,
      value: RespuestasEncuestaInApp[K]
    ) => {
      setRespuestas((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  async function enviar() {
    if (!completo || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/cliente/encuesta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: encuesta.token,
          respuestas: respuestas as RespuestasEncuestaInApp,
          comentario: comentario.trim() || undefined
        })
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        huellitasRegalo?: number;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo enviar.");
      }
      setExito(true);
      onEnviada?.();
      window.setTimeout(() => onCerrar(), 2200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="encuesta-post-compra-titulo"
    >
      <button
        type="button"
        className="absolute inset-0 bg-bark-900/55 backdrop-blur-sm"
        aria-label="Cerrar encuesta"
        onClick={onCerrar}
      />

      <div className="relative flex max-h-[min(92vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-bark-100">
        {exito ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <CheckCircle2
              className="mb-4 h-14 w-14 text-emerald-600"
              strokeWidth={1.5}
              aria-hidden
            />
            <h2 className="font-display text-xl font-semibold text-bark-800">
              ¡Gracias por ayudarnos a mejorar!
            </h2>
            <p className="mt-2 text-sm text-bark-600">
              Tu opinión ya está registrada en {encuesta.nombreLocal}.
            </p>
          </div>
        ) : (
          <>
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-bark-100 bg-cream-50 px-5 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-terracotta-600">
                  Post-compra
                </p>
                <h2
                  id="encuesta-post-compra-titulo"
                  className="font-display text-lg font-semibold text-bark-800"
                >
                  ¿Cómo fue tu visita?
                </h2>
                <p className="mt-1 text-sm text-bark-500">
                  Hola, {encuesta.nombreCliente}. Sumaste puntos recién — contanos
                  cómo te fue en {encuesta.nombreLocal}.
                </p>
              </div>
              <button
                type="button"
                onClick={onCerrar}
                className="shrink-0 rounded-full p-2 text-bark-500 hover:bg-bark-100"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {PREGUNTAS_ENCUESTA_IN_APP.map((pregunta) => (
                <fieldset key={pregunta.id} className="space-y-2.5">
                  <legend className="text-sm font-semibold text-bark-800">
                    {pregunta.titulo}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {pregunta.opciones.map((op) => {
                      const activo = respuestas[pregunta.id] === op.value;
                      return (
                        <button
                          key={op.value}
                          type="button"
                          onClick={() => setCampo(pregunta.id, op.value)}
                          className={cn(
                            "rounded-full border px-3.5 py-2 text-sm font-medium transition",
                            activo
                              ? "border-emerald-800 bg-emerald-800 text-white shadow-sm"
                              : "border-bark-200 bg-white text-bark-700 hover:border-emerald-300 hover:bg-emerald-50"
                          )}
                        >
                          {op.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}

              <div>
                <label
                  htmlFor="encuesta-comentario"
                  className="flex items-center gap-2 text-sm font-semibold text-bark-800"
                >
                  <MessageSquare size={16} className="text-terracotta-500" />
                  Déjanos tu comentario, sugerencia o queja
                  <span className="font-normal text-bark-500">(opcional)</span>
                </label>
                <textarea
                  id="encuesta-comentario"
                  className="input-elegant mt-2 min-h-[96px] w-full resize-y rounded-2xl"
                  placeholder="Ej: el personal fue muy amable, pero esperamos un poco para la consulta…"
                  maxLength={2000}
                  value={comentario}
                  disabled={enviando}
                  onChange={(e) => setComentario(e.target.value)}
                />
              </div>

              {error ? (
                <p className="text-center text-sm text-red-600">{error}</p>
              ) : null}
            </div>

            <footer className="shrink-0 border-t border-bark-100 bg-cream-50 px-5 py-4">
              <button
                type="button"
                disabled={!completo || enviando}
                onClick={() => void enviar()}
                className="btn-primary w-full justify-center"
              >
                {enviando ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  <>
                    <PuntoIcon size={18} className="text-white" />
                    Enviar
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-[11px] text-bark-500">
                +{encuesta.huellitasRegalo} Puntos de regalo al completar
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
