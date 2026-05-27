import { generarQrSvg } from "@/lib/qr/generate";
import { normalizarCodigoCliente } from "@/lib/huellitas/codigosClientes";
import { payloadQrCliente } from "@/lib/qr/scannerPayloads";
import { CredencialDigitalClientePanel } from "@/components/qr/CredencialDigitalClientePanel";

export interface CredencialDigitalClienteProps {
  /** Código corto del cliente en Firestore (ej. "YMS-Q6Y"). */
  codigoCliente?: string;
  qrSize?: number;
  className?: string;
}

/**
 * Credencial con selector QR / barras (render en cliente).
 * QR y barras emiten el mismo `codigoCliente`, sin prefijos.
 */
export async function CredencialDigitalCliente({
  codigoCliente,
  qrSize = 320,
  className
}: CredencialDigitalClienteProps) {
  const codigo =
    (codigoCliente && normalizarCodigoCliente(codigoCliente)) ||
    codigoCliente?.trim().toUpperCase() ||
    "";

  if (!codigo) {
    return (
      <CredencialDigitalClientePanel
        codigoCredencial={null}
        qrSvgHtml=""
        qrSize={qrSize}
        className={className}
      />
    );
  }

  const payloadQr = payloadQrCliente(codigo);
  const qrSvgHtml = await generarQrSvg(payloadQr, { width: qrSize });

  return (
    <CredencialDigitalClientePanel
      codigoCredencial={codigo}
      qrSvgHtml={qrSvgHtml}
      qrSize={qrSize}
      className={className}
    />
  );
}
