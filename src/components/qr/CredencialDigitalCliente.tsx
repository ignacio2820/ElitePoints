import { generarQrSvg } from "@/lib/qr/generate";
import { payloadQrCliente } from "@/lib/qr/scannerPayloads";
import { sufijoBarrasDesdeClienteId } from "@/lib/huellitas/identificadorBarras";
import { CredencialDigitalClientePanel } from "@/components/qr/CredencialDigitalClientePanel";

export interface CredencialDigitalClienteProps {
  clienteId: string;
  telefono?: string;
  dni?: string;
  qrSize?: number;
  className?: string;
}

/**
 * Credencial con selector QR / barras (render en cliente).
 */
export async function CredencialDigitalCliente({
  clienteId,
  telefono,
  dni,
  qrSize = 320,
  className
}: CredencialDigitalClienteProps) {
  const payloadQr = payloadQrCliente(clienteId);
  const qrSvgHtml = await generarQrSvg(payloadQr, { width: qrSize });
  void telefono;
  void dni;
  const valorBarras = sufijoBarrasDesdeClienteId(clienteId) || null;

  return (
    <CredencialDigitalClientePanel
      clienteId={clienteId}
      qrSvgHtml={qrSvgHtml}
      valorBarras={valorBarras}
      qrSize={qrSize}
      className={className}
    />
  );
}
