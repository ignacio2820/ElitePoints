import { cn } from "@/lib/utils";
import {
  payloadCodigoBarrasCliente,
  payloadQrCliente
} from "@/lib/qr/scannerPayloads";
import { CodigoBarrasLectorFisico } from "@/components/qr/CodigoBarrasLectorFisico";
import { QrEscanerFisicoSvg } from "@/components/qr/QrEscanerFisicoSvg";

export interface CredencialDigitalClienteProps {
  /** ID Firestore del cliente. */
  clienteId: string;
  qrSize?: number;
  className?: string;
}

/**
 * Tarjeta única: QR (Code 128 matrix) + Code 39 en barras para láser Megawin.
 */
export async function CredencialDigitalCliente({
  clienteId,
  qrSize = 300,
  className
}: CredencialDigitalClienteProps) {
  const payloadQr = payloadQrCliente(clienteId);
  const payloadBarras = payloadCodigoBarrasCliente(clienteId);

  return (
    <article
      className={cn(
        "w-full max-w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-soft ring-1 ring-black/5",
        className
      )}
    >
      <div className="flex flex-col items-center bg-white px-4 pt-6 sm:px-6 sm:pt-8">
        <QrEscanerFisicoSvg payload={payloadQr} size={qrSize} embedded />
      </div>

      <div
        role="separator"
        className="mx-6 border-t border-neutral-200 sm:mx-8"
        aria-hidden
      />

      <CodigoBarrasLectorFisico value={payloadBarras} embedded />
    </article>
  );
}
