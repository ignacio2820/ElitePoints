import { cn } from "@/lib/utils";
import { CodigoBarrasLectorFisico } from "@/components/qr/CodigoBarrasLectorFisico";
import { QrEscanerFisicoSvg } from "@/components/qr/QrEscanerFisicoSvg";

export interface CredencialDigitalClienteProps {
  /** Payload `MP-CLIENTE:{id}` (QR y barras). */
  payload: string;
  qrSize?: number;
  className?: string;
}

/**
 * Tarjeta única: QR arriba + divisor + código de barras grande (screen-to-laser).
 */
export async function CredencialDigitalCliente({
  payload,
  qrSize = 300,
  className
}: CredencialDigitalClienteProps) {
  return (
    <article
      className={cn(
        "w-full max-w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-soft ring-1 ring-black/5",
        className
      )}
    >
      <div className="flex flex-col items-center bg-white px-4 pt-6 sm:px-6 sm:pt-8">
        <QrEscanerFisicoSvg payload={payload} size={qrSize} embedded />
      </div>

      <div
        role="separator"
        className="mx-6 border-t border-neutral-200 sm:mx-8"
        aria-hidden
      />

      <CodigoBarrasLectorFisico value={payload} embedded />
    </article>
  );
}
