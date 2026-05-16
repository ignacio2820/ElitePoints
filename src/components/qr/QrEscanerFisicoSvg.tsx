import { generarQrSvg } from "@/lib/qr/generate";

export interface QrEscanerFisicoSvgProps {
  payload: string;
  size?: number;
  className?: string;
}

const TAMANO_DEFAULT = 300;

/**
 * QR en SVG para páginas server: mismo estándar de contraste y margen que QrEscanerFisico.
 */
export async function QrEscanerFisicoSvg({
  payload,
  size = TAMANO_DEFAULT,
  className = ""
}: QrEscanerFisicoSvgProps) {
  const svg = await generarQrSvg(payload, { width: size });

  return (
    <div
      className={`inline-block rounded-2xl bg-[#FFFFFF] p-6 ${className}`}
      style={{ colorScheme: "light" }}
    >
      <div
        className="mx-auto flex items-center justify-center bg-[#FFFFFF] [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-full"
        style={{ width: size, maxWidth: "100%" }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
