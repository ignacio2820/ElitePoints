"use client";

import Barcode from "react-barcode";
import { cn } from "@/lib/utils";

export interface CodigoBarrasLectorFisicoProps {
  /** Payload Code 39 (p. ej. `MP-CLIENTE-{id}`). */
  value: string;
  className?: string;
  /** Dentro de `CredencialDigitalCliente` (sin tarjeta propia). */
  embedded?: boolean;
}

/**
 * Code 39 + contenedor sin compresión (screen-to-laser / Megawin).
 * `quietZone` → márgenes JsBarcode (no existe prop quietZone en react-barcode).
 */
const BARRAS_MEGAWIN = {
  format: "CODE39" as const,
  width: 3,
  height: 80,
  displayValue: true,
  background: "#FFFFFF",
  lineColor: "#000000",
  margin: 20,
  marginLeft: 20,
  marginRight: 20,
  marginTop: 16,
  marginBottom: 12,
  textMargin: 8,
  fontSize: 13,
  renderer: "svg" as const
};

/**
 * Evita que el SVG se encoja dentro del flex: tamaño nativo + scroll horizontal.
 */
function BarrasSinCompresion({ value }: { value: string }) {
  return (
    <div className="w-full overflow-x-auto flex items-center justify-center rounded-xl bg-white p-4 [-webkit-overflow-scrolling:touch]">
      <div
        className="inline-flex shrink-0 min-w-max origin-center [&_svg]:block [&_svg]:!max-w-none [&_svg]:!h-auto [&_svg]:opacity-100"
        style={{
          transform: "scaleX(1.12)",
          transformOrigin: "center center",
          imageRendering: "pixelated"
        }}
      >
        <Barcode value={value} {...BARRAS_MEGAWIN} />
      </div>
    </div>
  );
}

export function CodigoBarrasLectorFisico({
  value,
  className,
  embedded = false
}: CodigoBarrasLectorFisicoProps) {
  const codigo = value.trim();
  if (!codigo) return null;

  if (embedded) {
    return (
      <section
        className={cn("w-full min-w-0 bg-white p-4 sm:p-6", className)}
        aria-label="Código de barras para lector láser"
      >
        <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-bark-500">
          Lector láser — Code 39
        </p>
        <BarrasSinCompresion value={codigo} />
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
      <BarrasSinCompresion value={codigo} />
    </div>
  );
}
