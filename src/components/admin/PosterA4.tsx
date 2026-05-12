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
    color: { dark: "#1B4332", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
    width: 420
  });

  return (
    <article className="poster-sheet mx-auto bg-white text-bark-700 shadow-soft print:shadow-none">
      <div className="poster-frame flex min-h-[297mm] flex-col border-2 border-bark-600 p-[14mm]">
        <header className="border-b-2 border-terracotta-400 pb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-terracotta-400 bg-white p-2">
            <LocalBrandMark
              nombreLocal={nombreLocal}
              logoUrl={logoUrl}
              size={64}
              imageClassName="rounded-2xl border-0"
            />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-bark-400">
            Programa de lealtad
          </p>
          <h1 className="mt-3 font-display text-[2.35rem] font-semibold leading-[1.08] text-bark-700">
            {nombreLocal}
          </h1>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <p className="max-w-[165mm] font-display text-[2rem] font-semibold leading-tight text-bark-700">
            ¡Sumá Huellitas y canjeá premios!
          </p>

          <div className="mt-8 rounded-[28px] border-2 border-terracotta-400 bg-white p-5 shadow-[inset_0_0_0_1px_rgba(251,133,0,0.2)]">
            <div
              className="mx-auto"
              style={{ width: 420, height: 420 }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-bark-400">
            Escaneá para registrarte
          </p>
          <p className="mt-2 max-w-[165mm] break-all font-mono text-[10px] text-bark-400/80">
            {registroUrl}
          </p>

          <div className="mt-8 flex items-center justify-center gap-3 rounded-full border border-bark-100 bg-cream-50 px-5 py-3">
            <HuellitaIcon size={28} className="text-terracotta-400" />
            <span className="font-display text-lg font-semibold text-bark-600">
              Huellitas
            </span>
          </div>
        </div>

        <MascotPointsFooter variant="poster" />
      </div>
    </article>
  );
}
