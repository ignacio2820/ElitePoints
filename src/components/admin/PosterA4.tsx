import QRCode from "qrcode";
import { Cake, Gift, Sparkles } from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";

export interface PosterA4Props {
  nombreLocal: string;
  localId: string;
  registroUrl: string;
}

const BENEFICIOS = [
  {
    Icon: Gift,
    texto: "🎁 +100 de Regalo en tu primera compra."
  },
  {
    Icon: Cake,
    texto: "🎂 Doble Huellitas el día del cumple de tu mascota."
  },
  {
    Icon: Sparkles,
    texto: "✨ Canjeá por premios exclusivos."
  }
] as const;

export async function PosterA4({
  nombreLocal,
  localId,
  registroUrl
}: PosterA4Props) {
  const qrSvg = await QRCode.toString(registroUrl, {
    type: "svg",
    margin: 1,
    color: { dark: "#221308", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
    width: 360
  });

  return (
    <article className="poster-sheet mx-auto bg-white text-[#221308] shadow-[0_24px_80px_-32px_rgba(34,19,8,0.35)] print:shadow-none">
      <div className="poster-frame flex min-h-[297mm] flex-col border-2 border-[#221308] p-[14mm]">
        <div className="border-b-2 border-[#C9A227] pb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#C9A227] bg-white">
            <HuellitaIcon size={28} className="text-[#C9A227]" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#6B5848]">
            Programa de lealtad
          </p>
          <h2 className="mt-3 font-display text-[2.35rem] font-semibold leading-[1.08] text-[#221308]">
            ¡Sumá Huellitas en{" "}
            <span className="text-[#B8860B]">{nombreLocal}</span>!
          </h2>
          <p className="mx-auto mt-4 max-w-[150mm] text-sm leading-relaxed text-[#6B5848]">
            Escaneá el código, registrate en segundos y empezá a sumar
            recompensas en cada visita.
          </p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-10">
          <div className="rounded-[28px] border-2 border-[#C9A227] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(201,162,39,0.25)]">
            <div
              className="mx-auto"
              style={{ width: 360, height: 360 }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>
          <p className="mt-6 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#6B5848]">
            Escaneá para registrarte
          </p>
          <p className="mt-2 max-w-[165mm] break-all text-center font-mono text-[10px] text-[#6B5848]/80">
            {registroUrl}
          </p>
        </div>

        <div className="border-t-2 border-[#C9A227] pt-8">
          <ul className="grid gap-5">
            {BENEFICIOS.map(({ Icon, texto }) => (
              <li key={texto} className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#C9A227] bg-[#FFFCF4] text-[#B8860B]">
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <p className="pt-2 font-display text-lg font-medium leading-snug text-[#221308]">
                  {texto}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <footer className="mt-8 flex items-end justify-between gap-4 border-t border-[#E8DCC8] pt-4 text-[10px] uppercase tracking-[0.18em] text-[#6B5848]">
          <span>Huellitas</span>
          <span>{localId}</span>
        </footer>
      </div>
    </article>
  );
}
