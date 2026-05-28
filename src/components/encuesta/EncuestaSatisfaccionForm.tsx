"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PuntoIcon } from "@/components/PuntoIcon";
import type { VistaEncuestaPublica } from "@/lib/huellitas/encuestasService";

interface Props {
  localId: string;
  token: string;
  vistaInicial: VistaEncuestaPublica;
}

function formatearFecha(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "long",
      timeStyle: "short"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function EncuestaSatisfaccionForm({
  localId,
  token,
  vistaInicial
}: Props) {
  const [vista] = useState(vistaInicial);
  const [puntuacion, setPuntuacion] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<{
    huellitasRegalo: number;
    yaCompletada: boolean;
  } | null>(null);

  const activa = vista.disponible && !vista.completada && !vista.expirada;

  const mensajeEspera = useMemo(() => {
    if (vista.completada || exito) return null;
    if (vista.expirada) return "Este enlace ya no está disponible.";
    if (!vista.disponible) {
      return `Tu encuesta se habilita el ${formatearFecha(vista.fechaEnvioEncuesta)}.`;
    }
    return null;
  }, [vista, exito]);

  async function enviar() {
    if (!activa || puntuacion < 1) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/encuesta/${encodeURIComponent(localId)}/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            puntuacion,
            comentario: comentario.trim() || undefined
          })
        }
      );
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        huellitasRegalo?: number;
        yaCompletada?: boolean;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo enviar la encuesta.");
      }
      setExito({
        huellitasRegalo: data.huellitasRegalo ?? vista.huellitasRegalo,
        yaCompletada: Boolean(data.yaCompletada)
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar.");
    } finally {
      setEnviando(false);
    }
  }

  if (vista.completada && !exito) {
    return (
      <EstadoFinal
        titulo="Ya registramos tu opinión"
        subtitulo="Gracias por haber participado antes."
        puntos={vista.huellitasRegalo}
        mostrarRegalo={false}
      />
    );
  }

  if (exito) {
    return (
      <EstadoFinal
        titulo="¡Gracias por ayudarnos a mejorar!"
        subtitulo={
          exito.yaCompletada
            ? "Tu encuesta ya estaba registrada."
            : `Sumaste ${exito.huellitasRegalo} Puntos extra`
        }
        puntos={exito.huellitasRegalo}
        mostrarRegalo={!exito.yaCompletada}
      />
    );
  }

  return (
    <Panel className="surface-card mx-auto w-full max-w-md rounded-3xl p-6 sm:p-8">
      <header className="mb-6 text-center">
        <p className="label-elegant mb-1">Encuesta de satisfacción</p>
        <h1 className="text-xl font-bold text-emerald-900 sm:text-2xl">
          {vista.nombreLocal}
        </h1>
        <p className="mt-2 text-sm text-bark-600">
          Hola, {vista.nombreCliente}. ¿Cómo fue tu experiencia?
        </p>
      </header>

      {mensajeEspera ? (
        <p className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-center text-sm text-emerald-900">
          {mensajeEspera}
        </p>
      ) : (
        <>
          <p className="mb-3 text-center text-sm font-semibold text-bark-700">
            Calificá del 1 al 5
          </p>
          <Panel
            className="mb-6 flex justify-center gap-2 sm:gap-3"
            role="radiogroup"
            aria-label="Calificación con puntos"
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const valor = hover || puntuacion;
              const seleccionado = valor >= n;
              const color = seleccionado
                ? hover > 0
                  ? "text-[#fb8500]"
                  : "text-emerald-600"
                : "text-bark-200";
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={puntuacion === n}
                  disabled={!activa || enviando}
                  className="rounded-full p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fb8500]/40 disabled:opacity-50"
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onFocus={() => setHover(n)}
                  onBlur={() => setHover(0)}
                  onClick={() => setPuntuacion(n)}
                >
                  <PuntoIcon
                    size={40}
                    filled={seleccionado}
                    className={color}
                  />
                  <span className="sr-only">{n} puntos</span>
                </button>
              );
            })}
          </Panel>

          <label className="mb-2 block text-sm font-semibold text-emerald-900">
            Comentario{" "}
            <span className="font-normal text-bark-500">(opcional)</span>
          </label>
          <textarea
            className="input-elegant mb-4 min-h-[100px] resize-y rounded-2xl"
            placeholder="Contanos qué podemos mejorar…"
            maxLength={2000}
            value={comentario}
            disabled={!activa || enviando}
            onChange={(e) => setComentario(e.target.value)}
          />

          {error ? (
            <p className="mb-3 text-center text-sm text-red-600">{error}</p>
          ) : null}

          <button
            type="button"
            className="btn-primary w-full"
            disabled={!activa || enviando || puntuacion < 1}
            onClick={() => void enviar()}
          >
            {enviando ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Enviando…
              </>
            ) : (
              "Enviar encuesta"
            )}
          </button>

          <p className="mt-4 text-center text-xs text-bark-500">
            Al enviar, sumás {vista.huellitasRegalo} Puntos de regalo en tu
            billetera.
          </p>
        </>
      )}
    </Panel>
  );
}

function EstadoFinal({
  titulo,
  subtitulo,
  puntos,
  mostrarRegalo
}: {
  titulo: string;
  subtitulo: string;
  puntos: number;
  mostrarRegalo: boolean;
}) {
  return (
    <Panel className="surface-card mx-auto w-full max-w-md rounded-3xl p-8 text-center">
      <CheckCircle2
        className="mx-auto mb-4 h-14 w-14 text-emerald-600"
        strokeWidth={1.5}
        aria-hidden
      />
      <h1 className="text-xl font-bold text-emerald-900">{titulo}</h1>
      <p className="mt-2 text-bark-700">{subtitulo}</p>
      {mostrarRegalo ? (
        <Panel className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
          <PuntoIcon size={22} className="text-[#fb8500]" />
          +{puntos} Puntos
        </Panel>
      ) : null}
    </Panel>
  );
}

function Panel({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}
