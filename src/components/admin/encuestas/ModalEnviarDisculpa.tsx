"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Gift, Loader2, X } from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { HUELLITAS_OPCIONES_DISCULPA } from "@/lib/huellitas/encuestasConstants";
import type { AlertaEncuestaAdmin } from "@/lib/huellitas/encuestasAlertasService";
import { cn } from "@/lib/utils";

interface Props {
  alerta: AlertaEncuestaAdmin;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalEnviarDisculpa({ alerta, onClose, onSuccess }: Props) {
  const [huellitas, setHuellitas] = useState<number>(HUELLITAS_OPCIONES_DISCULPA[0]);
  const [nota, setNota] = useState(
    `Hola ${alerta.nombreCliente}, lamentamos que tu experiencia no haya sido la esperada. Queremos compensarte con Huellitas de regalo.`
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !enviando) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, enviando]);

  async function confirmar() {
    if (enviando || nota.trim().length < 3) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/encuestas/alertas/${encodeURIComponent(alerta.encuestaId)}/disculpa`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ huellitas, nota: nota.trim() })
        }
      );
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo enviar la disculpa.");
      }
      setExito(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && !enviando && onClose()}
    >
      <div className="modal-panel max-w-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#fb8500]">
              Recuperación de cliente
            </p>
            <h2 className="font-display text-2xl font-semibold text-emerald-900">
              Enviar disculpa
            </h2>
            <p className="mt-1 text-sm text-bark-600">{alerta.nombreCliente}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="rounded-full p-2 text-bark-400 hover:bg-cream-100"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {exito ? (
          <div className="mt-8 flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" strokeWidth={1.5} />
            <p className="mt-3 font-semibold text-emerald-900">
              Disculpa enviada y Huellitas acreditadas
            </p>
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm text-bark-600">
              Elegí la compensación y una nota personalizada. Se acreditará en la
              billetera del cliente y la alerta quedará resuelta.
            </p>

            <p className="label-elegant mt-6 mb-2">Huellitas compensatorias</p>
            <div className="flex flex-wrap gap-2">
              {HUELLITAS_OPCIONES_DISCULPA.map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={enviando}
                  onClick={() => setHuellitas(n)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition",
                    huellitas === n
                      ? "bg-emerald-800 text-white shadow-sm"
                      : "bg-white text-emerald-900 ring-1 ring-emerald-200 hover:ring-[#fb8500]"
                  )}
                >
                  <HuellitaIcon size={16} className={huellitas === n ? "text-[#fb8500]" : "text-emerald-600"} />
                  +{n}
                </button>
              ))}
            </div>

            <label className="label-elegant mt-6 mb-2 block">
              Nota de disculpa
            </label>
            <textarea
              className="input-elegant min-h-[100px] resize-y rounded-2xl"
              maxLength={500}
              value={nota}
              disabled={enviando}
              onChange={(e) => setNota(e.target.value)}
            />

            {error ? (
              <p className="mt-3 text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-bark-600 ring-1 ring-bark-200 hover:bg-cream-50"
                disabled={enviando}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={enviando || nota.trim().length < 3}
                onClick={() => void confirmar()}
              >
                {enviando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando…
                  </>
                ) : (
                  <>
                    <Gift size={18} />
                    Confirmar disculpa
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
