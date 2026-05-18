"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Fecha/hora actual en formato `datetime-local` (zona local). */
export function ahoraDatetimeLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Valor en formato `datetime-local` (YYYY-MM-DDTHH:mm). */
export function combinarFechaHora(fecha: string, hora: string): string {
  if (!fecha || !hora) return "";
  return `${fecha}T${hora}`;
}

export function separarFechaHora(valor: string): { fecha: string; hora: string } {
  if (!valor || !valor.includes("T")) return { fecha: "", hora: "" };
  const [fecha, hora] = valor.split("T");
  return { fecha: fecha ?? "", hora: (hora ?? "").slice(0, 5) };
}

function valorMinimoLocal(min?: string): { fecha: string; hora: string } {
  const base = min ? new Date(min) : new Date();
  if (Number.isNaN(base.getTime())) return separarFechaHora(min ?? "");
  return {
    fecha: `${base.getFullYear()}-${pad2(base.getMonth() + 1)}-${pad2(base.getDate())}`,
    hora: `${pad2(base.getHours())}:${pad2(base.getMinutes())}`
  };
}

function formatearEtiqueta(valor: string): string {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

type Props = {
  value: string;
  onChange: (valor: string) => void;
  label?: React.ReactNode;
  required?: boolean;
  /** Mínimo en formato datetime-local */
  min?: string;
  className?: string;
  disabled?: boolean;
};

export function DateTimePickerField({
  value,
  onChange,
  label,
  required,
  min,
  className,
  disabled
}: Props) {
  const uid = useId();
  const popoverId = `${uid}-popover`;
  const [abierto, setAbierto] = useState(false);
  const [draftFecha, setDraftFecha] = useState("");
  const [draftHora, setDraftHora] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const abrir = useCallback(() => {
    if (disabled) return;
    const { fecha, hora } = value
      ? separarFechaHora(value)
      : valorMinimoLocal(min);
    setDraftFecha(fecha);
    setDraftHora(hora || "20:00");
    setErrorLocal(null);
    setAbierto(true);
  }, [disabled, value, min]);

  const cerrar = useCallback(() => {
    setAbierto(false);
    setErrorLocal(null);
  }, []);

  const confirmar = useCallback(() => {
    if (!draftFecha || !draftHora) {
      setErrorLocal("Elegí fecha y hora.");
      return;
    }
    const combinado = combinarFechaHora(draftFecha, draftHora);
    if (min && combinado < min) {
      setErrorLocal("La fecha y hora deben ser futuras.");
      return;
    }
    onChange(combinado);
    cerrar();
  }, [draftFecha, draftHora, min, onChange, cerrar]);

  useEffect(() => {
    if (!abierto) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (contenedorRef.current?.contains(target)) return;
      cerrar();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [abierto, cerrar]);

  const etiqueta = formatearEtiqueta(value);
  const minDesglosado = valorMinimoLocal(min);

  return (
    <div ref={contenedorRef} className={cn("relative", className)}>
      {label ? <span className="label-elegant">{label}</span> : null}

      <button
        type="button"
        id={uid}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={popoverId}
        disabled={disabled}
        onClick={() => (abierto ? cerrar() : abrir())}
        className={cn(
          "input-elegant mt-2 flex w-full items-center justify-between gap-2 text-left",
          !etiqueta && "text-bark-400",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarClock
            size={18}
            className="shrink-0 text-emerald-600"
            aria-hidden
          />
          <span className="truncate">
            {etiqueta || "Elegir fecha y hora de cierre"}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-bark-400 transition-transform",
            abierto && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {required ? (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      ) : null}

      {abierto ? (
        <div
          id={popoverId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={uid}
          className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-bark-200 bg-white shadow-lg ring-1 ring-black/5 sm:right-auto sm:min-w-[300px]"
        >
          <div className="border-b border-bark-100 bg-cream-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-bark-500">
              Fecha y hora de cierre
            </p>
            <p className="mt-0.5 text-sm text-bark-600">
              Elegí y confirmá para guardar en el formulario.
            </p>
          </div>

          <div className="space-y-4 p-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-bark-500">
                Fecha
              </span>
              <input
                type="date"
                value={draftFecha}
                min={minDesglosado.fecha || undefined}
                onChange={(e) => setDraftFecha(e.target.value)}
                className="input-elegant mt-1.5 w-full"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-bark-500">
                Hora
              </span>
              <input
                type="time"
                value={draftHora}
                onChange={(e) => setDraftHora(e.target.value)}
                className="input-elegant mt-1.5 w-full"
              />
            </label>

            {errorLocal ? (
              <p className="text-sm font-medium text-red-600" role="alert">
                {errorLocal}
              </p>
            ) : null}
          </div>

          <div className="border-t border-bark-100 bg-cream-50/50 p-3">
            <button
              type="button"
              onClick={confirmar}
              className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
            >
              Confirmar Fecha y Hora
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
