import { payloadQrCliente } from "@/lib/qr/scannerPayloads";
import { CodigoBarrasLectorFisico } from "@/components/qr/CodigoBarrasLectorFisico";
import { QrEscanerFisicoSvg } from "@/components/qr/QrEscanerFisicoSvg";
import { HuellitaIcon } from "@/components/HuellitaIcon";

export interface QRClienteProps {
  /** ID Firestore del cliente (payload corto MP-CLIENTE:…). */
  clienteId: string;
  size?: number;
  caption?: string;
}

/**
 * Server component: QR de identificación optimizado para lectores físicos en pantalla.
 */
export async function QRCliente({
  clienteId,
  size = 280,
  caption
}: QRClienteProps) {
  const payload = payloadQrCliente(clienteId);

  return (
    <div className="relative inline-block text-center">
      <div className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-bark-700 text-cream-50 ring-4 ring-[#FFFFFF]">
        <HuellitaIcon size={16} className="text-cream-50" />
      </div>
      <div className="flex flex-col items-center gap-4">
        <QrEscanerFisicoSvg payload={payload} size={size} />
        <CodigoBarrasLectorFisico value={payload} />
      </div>
      {caption ? (
        <p className="mt-3 text-xs uppercase tracking-widest text-bark-500">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
