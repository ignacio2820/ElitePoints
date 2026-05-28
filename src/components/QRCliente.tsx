import { CredencialDigitalCliente } from "@/components/qr/CredencialDigitalCliente";
import { PuntoIcon } from "@/components/PuntoIcon";

export interface QRClienteProps {
  /** Código corto del cliente (ej. "YMS-Q6Y"). */
  codigoCliente: string;
  size?: number;
  caption?: string;
}

/**
 * Server component: credencial digital (QR + barras) para lectores en pantalla.
 */
export async function QRCliente({
  codigoCliente,
  size = 280,
  caption
}: QRClienteProps) {
  return (
    <div className="relative inline-block w-full max-w-full text-center">
      <div className="absolute -left-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-bark-700 text-cream-50 ring-4 ring-white">
        <PuntoIcon size={16} className="text-cream-50" />
      </div>
      <CredencialDigitalCliente codigoCliente={codigoCliente} qrSize={size} />
      {caption ? (
        <p className="mt-3 text-xs uppercase tracking-widest text-bark-500">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
