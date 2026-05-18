"use client";

import Barcode from "react-barcode";
import { cn } from "@/lib/utils";

export interface CodigoBarrasLectorFisicoProps {
  value: string;
  className?: string;
  fullscreen?: boolean;
  embedded?: boolean;
}

const BARRAS_PANTALLA_FULL = {
  format: "CODE128" as const,
  width: 3.5,
  height: 120,
  displayValue: true,
  background: "#FFFFFF",
  lineColor: "#000000",
  margin: 0,
  marginLeft: 0,
  marginRight: 0,
  marginTop: 0,
  marginBottom: 0,
  textMargin: 10,
  fontSize: 14,
  renderer: "svg" as const
};

const BARRAS_COMPACTO = {
  format: "CODE39" as const,
  width: 3,
  height: 80,
  displayValue: true,
  background: "#FFFFFF",
  lineColor: "#000000",
  margin: 20,
  marginLeft: 20,
  marginRight: 20,
  fontSize: 13,
  renderer: "svg" as const
};

function BarrasPantallaCompleta({ value }: { value: string }) {
  return (
    <div className="flex w-full max-w-full items-center justify-center overflow-x-auto overflow-y-hidden px-2 [-webkit-overflow-scrolling:touch]">
      <div
        className={cn(
          "inline-flex shrink-0 min-w-max items-center justify-center",
          "rounded-xl bg-white p-6 shadow-lg",
          "rotate-90 sm:rotate-0",
          "[&_svg]:block [&_svg]:!max-w-none [&_svg]:!h-auto [&_svg]:opacity-100"
        )}
        style={{ colorScheme: "light" }}
      >
        <Barcode value={value} {...BARRAS_PANTALLA_FULL} />
      </div>
    </div>
  );
}

function BarrasCompactas({ value }: { value: string }) {
  return (
    <div className="flex w-full items-center justify-center overflow-x-auto rounded-xl bg-white p-4">
      <div className="inline-flex shrink-0 min-w-max [&_svg]:!max-w-none">
        <Barcode value={value} {...BARRAS_COMPACTO} />
      </div>
    </div>
  );
}

export function CodigoBarrasLectorFisico({
  value,
  className,
  fullscreen = false,
  embedded = false
}: CodigoBarrasLectorFisicoProps) {
  const codigo = value.trim();
  if (!codigo) return null;

  if (fullscreen) {
    return (
      <section
        className={cn("w-full min-w-0", className)}
        aria-label="Código de barras para lector láser"
      >
        <BarrasPantallaCompleta value={codigo} />
      </section>
    );
  }

  if (embedded) {
    return (
      <section
        className={cn("w-full min-w-0 bg-white p-4 sm:p-6", className)}
        aria-label="Código de barras para lector láser"
      >
        <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-bark-500">
          Lector láser
        </p>
        <BarrasCompactas value={codigo} />
      </section>
    );
  }

  return (
    <div
      className={cn(
        "w-full max-w-full rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm",
        className
      )}
    >
      <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-bark-500">
        También con lector láser
      </p>
      <BarrasCompactas value={codigo} />
    </div>
  );
}
