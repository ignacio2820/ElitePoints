"use client";

import Barcode from "react-barcode";
import { cn } from "@/lib/utils";

export interface CodigoBarrasLectorFisicoProps {
  /** Mismo valor que el QR (p. ej. `MP-CLIENTE:{id}`). */
  value: string;
  className?: string;
}

/**
 * Código de barras Code 128 para lectores láser en mostrador (Megawin y similares).
 * Mismo payload que el QR para compatibilidad con `extraerClienteIdDesdeQr`.
 */
export function CodigoBarrasLectorFisico({
  value,
  className
}: CodigoBarrasLectorFisicoProps) {
  const codigo = value.trim();
  if (!codigo) return null;

  return (
    <div
      className={cn(
        "w-full max-w-[min(100%,20rem)] rounded-2xl border border-neutral-200 bg-[#FFFFFF] p-4 shadow-sm",
        className
      )}
    >
      <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-bark-500">
        También con lector láser
      </p>
      <div className="flex w-full justify-center overflow-x-auto">
        <Barcode
          value={codigo}
          format="CODE128"
          width={1.35}
          height={48}
          displayValue
          background="#FFFFFF"
          lineColor="#000000"
          margin={6}
          fontSize={12}
          textMargin={4}
          renderer="svg"
        />
      </div>
    </div>
  );
}
