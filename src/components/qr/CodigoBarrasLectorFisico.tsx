"use client";

import Barcode from "react-barcode";
import { cn } from "@/lib/utils";

export interface CodigoBarrasLectorFisicoProps {
  /** Mismo valor que el QR (p. ej. `MP-CLIENTE:{id}`). */
  value: string;
  className?: string;
  /** Dentro de `CredencialDigitalCliente` (sin tarjeta propia). */
  embedded?: boolean;
}

/**
 * Parámetros screen-to-laser (jsbarcode vía react-barcode).
 * `quietZone` del brief = marginLeft/Right en JsBarcode (no existe prop quietZone).
 */
const BARRAS_SCREEN_TO_LASER = {
  format: "CODE128" as const,
  width: 5,
  height: 100,
  displayValue: true,
  background: "#FFFFFF",
  lineColor: "#000000",
  margin: 30,
  marginLeft: 30,
  marginRight: 30,
  marginTop: 20,
  marginBottom: 16,
  textMargin: 10,
  fontSize: 14,
  renderer: "svg" as const
};

/**
 * Code 128 para lectores láser en mostrador (Megawin, RS-232, etc.).
 * Mismo payload que el QR → `extraerClienteIdDesdeQr`.
 */
export function CodigoBarrasLectorFisico({
  value,
  className,
  embedded = false
}: CodigoBarrasLectorFisicoProps) {
  const codigo = value.trim();
  if (!codigo) return null;

  const barras = (
    <div className="flex w-full min-w-0 justify-center overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
      <Barcode value={codigo} {...BARRAS_SCREEN_TO_LASER} />
    </div>
  );

  if (embedded) {
    return (
      <section
        className={cn("w-full min-w-0 bg-white p-6 sm:p-8", className)}
        aria-label="Código de barras para lector láser"
      >
        <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-bark-500">
          Lector láser — Code 128
        </p>
        {barras}
      </section>
    );
  }

  return (
    <div
      className={cn(
        "w-full max-w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8",
        className
      )}
    >
      <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-bark-500">
        También con lector láser
      </p>
      {barras}
    </div>
  );
}
