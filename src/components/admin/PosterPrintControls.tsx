"use client";

import { Printer } from "lucide-react";

export function PosterPrintControls() {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden">
      <div>
        <span className="label-elegant">Material del comercio</span>
        <h1 className="mt-1 font-display text-3xl font-semibold text-bark-700">
          Póster de registro
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[color:var(--muted)]">
          Vista previa en A4. Imprimí en blanco y negro o a color; el diseño
          prioriza fondo blanco para ahorrar tinta.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.print()}
        className="btn-primary inline-flex items-center gap-2"
      >
        <Printer size={16} />
        Imprimir póster
      </button>
    </div>
  );
}
