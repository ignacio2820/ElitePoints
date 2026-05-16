import QRCode from "qrcode";

/** Colores puros para máximo contraste en pantalla (sin transparencias). */
export const QR_LECTOR_COLORS = {
  dark: "#000000",
  light: "#FFFFFF"
} as const;

/** Zona tranquila mínima (módulos); el padding visual va en el contenedor. */
export const QR_LECTOR_MARGIN_MODULOS = 4;

/** Con payloads cortos, M da módulos más grandes que H. */
export const QR_LECTOR_ERROR_LEVEL = "M" as const;

export type OpcionesQrLector = {
  width: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
};

export function opcionesQrLector({
  width,
  errorCorrectionLevel = QR_LECTOR_ERROR_LEVEL
}: OpcionesQrLector) {
  return {
    width,
    margin: QR_LECTOR_MARGIN_MODULOS,
    color: { ...QR_LECTOR_COLORS },
    errorCorrectionLevel
  };
}

export async function generarQrDataUrl(
  payload: string,
  opts: OpcionesQrLector
): Promise<string> {
  return QRCode.toDataURL(payload, opcionesQrLector(opts));
}

export async function generarQrSvg(
  payload: string,
  opts: OpcionesQrLector
): Promise<string> {
  return QRCode.toString(payload, {
    ...opcionesQrLector(opts),
    type: "svg"
  });
}
