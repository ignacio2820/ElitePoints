import { generarQrSvg } from "@/lib/qr/generate";

export interface QrEscanerFisicoSvgProps {
  payload: string;
  size?: number;
  className?: string;
  /** Sin marco propio: va dentro de `CredencialDigitalCliente`. */
  embedded?: boolean;
}

const TAMANO_DEFAULT = 300;

/**
 * QR en SVG para páginas server: mismo estándar de contraste y margen que QrEscanerFisico.
 */
export async function QrEscanerFisicoSvg({
  payload,
  size = TAMANO_DEFAULT,
  className = "",
  embedded = false
}: QrEscanerFisicoSvgProps) {
  const svg = await generarQrSvg(payload, { width: size });

  const qrInner = (
    <div
      className="mx-auto flex max-w-full items-center justify-center bg-white [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-full"
      style={{ width: size, maxWidth: "100%" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );

  if (embedded) {
    return (
      <div className={className} style={{ colorScheme: "light" }}>
        {qrInner}
      </div>
    );
  }

  return (
    <div
      className={`inline-block rounded-2xl bg-white p-6 ${className}`}
      style={{ colorScheme: "light" }}
    >
      {qrInner}
    </div>
  );
}
