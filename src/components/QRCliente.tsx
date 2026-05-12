import QRCode from "qrcode";
import { HuellitaIcon } from "@/components/HuellitaIcon";

export interface QRClienteProps {
  /** URL absoluta a la que apunta el QR (ej.: scan del admin). */
  url: string;
  size?: number;
  caption?: string;
}

/**
 * Server component: genera el SVG del QR sin librería de cliente.
 * Estética coherente: marco redondeado, paleta cálida, borde dashed.
 */
export async function QRCliente({ url, size = 220, caption }: QRClienteProps) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    color: { dark: "#1B4332", light: "#F8F9FA" },
    errorCorrectionLevel: "M",
    width: size
  });

  return (
    <div className="surface-card relative inline-block p-6 text-center">
      <div className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-bark-700 text-cream-50 ring-4 ring-cream-50">
        <HuellitaIcon size={16} className="text-cream-50" />
      </div>
      <div
        className="mx-auto rounded-2xl border border-dashed border-bark-200 bg-cream-50 p-3"
        style={{ width: size + 24, height: size + 24 }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {caption ? (
        <p className="mt-3 text-xs uppercase tracking-widest text-bark-400">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
