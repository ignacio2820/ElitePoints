import { generarQrSvg } from "@/lib/qr/generate";
import { payloadQrCliente } from "@/lib/qr/scannerPayloads";
import { CredencialDigitalClientePanel } from "@/components/qr/CredencialDigitalClientePanel";

export interface CredencialDigitalClienteProps {
  clienteId: string;
  qrSize?: number;
  className?: string;
}

/**
 * Credencial con selector QR / barras (render en cliente).
 */
export async function CredencialDigitalCliente({
  clienteId,
  qrSize = 320,
  className
}: CredencialDigitalClienteProps) {
  const payloadQr = payloadQrCliente(clienteId);
  const qrSvgHtml = await generarQrSvg(payloadQr, { width: qrSize });

  return (
    <CredencialDigitalClientePanel
      clienteId={clienteId}
      qrSvgHtml={qrSvgHtml}
      qrSize={qrSize}
      className={className}
    />
  );
}
