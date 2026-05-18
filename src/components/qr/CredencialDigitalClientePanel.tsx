"use client";

import { useState } from "react";
import { Barcode as BarcodeIcon, QrCode } from "lucide-react";
import { CodigoBarrasLectorFisico } from "@/components/qr/CodigoBarrasLectorFisico";
import { payloadQrCliente } from "@/lib/qr/scannerPayloads";
import { cn } from "@/lib/utils";

export type CredencialDisplayMode = "qr" | "barcode";

export interface CredencialDigitalClientePanelProps {
  clienteId: string;
  qrSvgHtml: string;
  qrSize?: number;
  className?: string;
}

/**
 * Credencial con pestañas: un solo código a la vez, tamaño generoso para escaneo.
 */
export function CredencialDigitalClientePanel({
  clienteId,
  qrSvgHtml,
  qrSize = 320,
  className
}: CredencialDigitalClientePanelProps) {
  const [displayMode, setDisplayMode] = useState<CredencialDisplayMode>("qr");
  const payloadBarras = payloadQrCliente(clienteId);

  return (
    <article
      className={cn(
        "w-full max-w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-soft ring-1 ring-black/5",
        className
      )}
    >
      <div
        className="border-b border-neutral-100 bg-white px-4 pb-4 pt-5 sm:px-6"
        role="tablist"
        aria-label="Tipo de código para mostrar en caja"
      >
        <div className="flex w-full rounded-full bg-emerald-50 p-1 ring-1 ring-emerald-800/20">
          <button
            type="button"
            role="tab"
            aria-selected={displayMode === "qr"}
            onClick={() => setDisplayMode("qr")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition",
              displayMode === "qr"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-emerald-900/75 hover:text-emerald-900"
            )}
          >
            <QrCode size={16} aria-hidden />
            Código QR
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={displayMode === "barcode"}
            onClick={() => setDisplayMode("barcode")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition",
              displayMode === "barcode"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-emerald-900/75 hover:text-emerald-900"
            )}
          >
            <BarcodeIcon size={16} aria-hidden />
            Código de barras
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-bark-500">
          {displayMode === "qr"
            ? "Para cámara o lector 2D en el mostrador"
            : "Para lector láser Megawin — barras grandes en pantalla"}
        </p>
      </div>

      <div
        className="flex min-h-[min(72vh,22rem)] w-full items-center justify-center bg-white px-4 py-6 sm:min-h-[20rem] sm:px-6 sm:py-8"
        role="tabpanel"
      >
        {displayMode === "qr" ? (
          <div
            className="flex w-full max-w-[min(100%,20rem)] justify-center rounded-2xl bg-white p-4"
            style={{ colorScheme: "light" }}
          >
            <div
              className="mx-auto flex w-full items-center justify-center bg-white [&_svg]:block [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-full"
              style={{ width: qrSize, maxWidth: "100%" }}
              dangerouslySetInnerHTML={{ __html: qrSvgHtml }}
            />
          </div>
        ) : (
          <CodigoBarrasLectorFisico value={payloadBarras} fullscreen />
        )}
      </div>
    </article>
  );
}
