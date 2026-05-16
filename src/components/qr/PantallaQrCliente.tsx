"use client";

import { BrilloMaximoQr } from "@/components/qr/BrilloMaximoQr";

interface Props {
  children: React.ReactNode;
}

/** Pantalla completa con fondo blanco y brillo máximo para escanear QR del cliente. */
export function PantallaQrCliente({ children }: Props) {
  return (
    <BrilloMaximoQr
      activo
      className="flex min-h-screen flex-col bg-[#FFFFFF] text-bark-800"
    >
      {children}
    </BrilloMaximoQr>
  );
}
