"use client";

import { useEffect, useState } from "react";
import { generarQrDataUrl } from "@/lib/qr/generate";
import { BrilloMaximoQr } from "@/components/qr/BrilloMaximoQr";

export interface QrEscanerFisicoProps {
  /** Texto corto a codificar (ej. MP-CLIENTE:xxx o MP-CANJE:ABC123). */
  payload: string;
  /** Ancho del QR en píxeles (matriz generada). */
  size?: number;
  alt: string;
  /** Clases del marco blanco alrededor del QR. */
  className?: string;
  /** Si false, no aplica BrilloMaximoQr (p. ej. ya está en un modal envuelto). */
  envolverBrillo?: boolean;
}

const TAMANO_DEFAULT = 280;

/**
 * QR optimizado para lectores físicos: negro puro sobre blanco, margen amplio, sin transparencia.
 */
export function QrEscanerFisico({
  payload,
  size = TAMANO_DEFAULT,
  alt,
  className = "",
  envolverBrillo = true
}: QrEscanerFisicoProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const activo = !!payload.trim();

  useEffect(() => {
    if (!activo) {
      setDataUrl(null);
      return;
    }
    let cancelado = false;
    void generarQrDataUrl(payload, { width: size })
      .then((url) => {
        if (!cancelado) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelado) setDataUrl(null);
      });
    return () => {
      cancelado = true;
    };
  }, [payload, size, activo]);

  const marco = (
    <div
      className="inline-block rounded-2xl bg-[#FFFFFF] p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]"
      style={{ colorScheme: "light" }}
    >
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt={alt}
          width={size}
          height={size}
          className="block h-auto w-full max-w-none"
          style={{
            width: size,
            height: size,
            imageRendering: "pixelated"
          }}
        />
      ) : (
        <div
          className="flex items-center justify-center bg-[#FFFFFF] text-center text-xs text-neutral-500"
          style={{ width: size, height: size }}
          aria-busy="true"
        >
          Generando QR…
        </div>
      )}
    </div>
  );

  if (!envolverBrillo) {
    return <div className={className}>{marco}</div>;
  }

  return (
    <BrilloMaximoQr activo={activo} className={className}>
      {marco}
    </BrilloMaximoQr>
  );
}
