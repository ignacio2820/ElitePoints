import { payloadQrCliente } from "@/lib/qr/scannerPayloads";
import { CredencialDigitalCliente } from "@/components/qr/CredencialDigitalCliente";
import { HuellitaIcon } from "@/components/HuellitaIcon";

export interface QRClienteProps {
  /** ID Firestore del cliente (payload corto MP-CLIENTE:…). */
  clienteId: string;
  size?: number;
  caption?: string;
}

/**
 * Server component: credencial digital (QR + Code 128) para lectores en pantalla.
 */
export async function QRCliente({
  clienteId,
  size = 280,
  caption
}: QRClienteProps) {
  const payload = payloadQrCliente(clienteId);

  return (
    <div className="relative inline-block w-full max-w-full text-center">
      <div className="absolute -left-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-bark-700 text-cream-50 ring-4 ring-white">
        <HuellitaIcon size={16} className="text-cream-50" />
      </div>
      <CredencialDigitalCliente payload={payload} qrSize={size} />
      {caption ? (
        <p className="mt-3 text-xs uppercase tracking-widest text-bark-500">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
