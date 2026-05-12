import QRCode from "qrcode";
import { LocalBrandMark } from "@/components/LocalBrandMark";
import { MascotPointsFooter } from "@/components/MascotPointsFooter";
import { HuellitaIcon } from "@/components/HuellitaIcon";

export interface PosterA4Props {
  nombreLocal: string;
  logoUrl?: string | null;
  registroUrl: string;
}

export async function PosterA4({
  nombreLocal,
  logoUrl,
  registroUrl
}: PosterA4Props) {
  const qrSvg = await QRCode.toString(registroUrl, {
    type: "svg",
    margin: 1,
    color: { dark: "#221308", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
    width: 420
  });

  return (
    <article className="poster-sheet mx-auto bg-white text-[#221308] shadow-[0_24px_80px_-32px_rgba(34,19,8,0.35)] print:shadow-none">
      <div className="poster-frame flex min-h-[297mm] flex-col border-2 border-[#221308] p-[14mm]">
        <header className="border-b-2 border-[#C9A227] pb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-[#C9A227] bg-white p-2">
            <LocalBrandMark
              nombreLocal={nombreLocal}
              logoUrl={logoUrl}
              size={64}
              imageClassName="rounded-2xl border-0"
            />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#6B5848]">
            Programa de lealtad
          </p>
          <h1 className="mt-3 font-display text-[2.35rem] font-semibold leading-[1.08] text-[#221308]">
            {nombreLocal}
          </h1>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <p className="max-w-[165mm] font-display text-[2rem] font-semibold leading-tight text-[#221308]">
            ¡Sumá Huellitas y canjeá premios!
          </p>

          <div className="mt-8 rounded-[28px] border-2 border-[#C9A227] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(201,162,39,0.25)]">
            <div
              className="mx-auto"
              style={{ width: 420, height: 420 }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#6B5848]">
            Escaneá para registrarte
          </p>
          <p className="mt-2 max-w-[165mm] break-all font-mono text-[10px] text-[#6B5848]/80">
            {registroUrl}
          </p>

          <div className="mt-8 flex items-center justify-center gap-3 rounded-full border border-[#E8DCC8] bg-[#FFFCF4] px-5 py-3">
            <HuellitaIcon size={28} className="text-[#C9A227]" />
            <span className="font-display text-lg font-semibold text-[#5C3D1E]">
              Huellitas
            </span>
          </div>
        </div>

        <MascotPointsFooter variant="poster" />
      </div>
    </article>
  );
}
