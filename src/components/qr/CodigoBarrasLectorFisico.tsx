"use client";

import Barcode from "react-barcode";
import { cn } from "@/lib/utils";

export interface CodigoBarrasLectorFisicoProps {
  value: string;
  className?: string;
  fullscreen?: boolean;
  embedded?: boolean;
}

/**
 * CODE128 compacto (8 caracteres) para lector láser Megawin: barras gruesas y legibles.
 * `margin` = quiet zone (jsbarcode / react-barcode).
 */
const BARRAS_MEGAWIN = {
  format: "CODE128" as const,
  width: 1.8,
  height: 70,
  displayValue: true,
  background: "#FFFFFF",
  lineColor: "#000000",
  margin: 15,
  marginLeft: 15,
  marginRight: 15,
  marginTop: 15,
  marginBottom: 15,
  textMargin: 4,
  fontSize: 12,
  renderer: "svg" as const
};

function BarrasCredencial({ value }: { value: string }) {
  return (
    <div
      className="w-full flex flex-col items-center justify-center rounded-2xl bg-white p-4"
      style={{ colorScheme: "light" }}
    >
      <div className="shrink-0 [&_svg]:block [&_svg]:h-auto [&_svg]:w-auto [&_svg]:max-w-none">
        <Barcode value={value} {...BARRAS_MEGAWIN} />
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
        className={cn(
          "w-full min-w-0 flex flex-col items-center justify-center",
          className
        )}
        aria-label="Código de barras para lector láser"
      >
        <BarrasCredencial value={codigo} />
      </section>
    );
  }

  if (embedded) {
    return (
      <section
        className={cn(
          "w-full min-w-0 flex flex-col items-center justify-center",
          className
        )}
        aria-label="Código de barras para lector láser"
      >
        <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-bark-500">
          Lector láser
        </p>
        <BarrasCredencial value={codigo} />
      </section>
    );
  }

  return (
    <div
      className={cn(
        "w-full max-w-full flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm",
        className
      )}
    >
      <p className="px-4 pt-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-bark-500">
        También con lector láser
      </p>
      <BarrasCredencial value={codigo} />
    </div>
  );
}
