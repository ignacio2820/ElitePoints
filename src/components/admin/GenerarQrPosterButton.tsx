"use client";

import { QrCode } from "lucide-react";

export function GenerarQrPosterButton() {
  function abrirPoster() {
    window.open("/admin/poster?print=1", "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={abrirPoster}
      className="btn-primary inline-flex items-center gap-2"
    >
      <QrCode size={16} />
      Generar QR para el Local
    </button>
  );
}
