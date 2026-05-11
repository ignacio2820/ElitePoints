"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Gift,
  Send,
  Sparkles,
  Users
} from "lucide-react";
import {
  renderMensajeReferido,
  urlRegistroConRef,
  urlWhatsApp
} from "@/lib/huellitas/referidos";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { cn, formatNumber } from "@/lib/utils";

export interface InvitarAmigosProps {
  localId: string;
  codigo: string;
  nombreLocal: string;
  baseUrl: string;
  mensajePlantilla: string;
  bonusBienvenida: number;
  bonusReferente: number;
  stats?: {
    referidosTotales: number;
    referidosActivados: number;
    huellitasGanadas: number;
  };
  className?: string;
}

/**
 * Sección "Invitar Amigos" en el perfil del cliente.
 * - Código grande, copiable.
 * - Botón directo a WhatsApp con mensaje pre-armado.
 * - Stats de cuántos invitados llegaron + huellitas ganadas.
 *
 * Estética: card sólida, el código va en una "boleta" con borde dashed
 * para invitar a copiarlo. Animación sutil al copiar.
 */
export function InvitarAmigos({
  localId,
  codigo,
  nombreLocal,
  baseUrl,
  mensajePlantilla,
  bonusBienvenida,
  bonusReferente,
  stats,
  className
}: InvitarAmigosProps) {
  const [copiado, setCopiado] = useState<"none" | "codigo" | "url">("none");

  const share = { localId, nombreLocal, codigo, baseUrl };
  const url = urlRegistroConRef(share);
  const wa = urlWhatsApp(mensajePlantilla, share);
  const previewMensaje = renderMensajeReferido(mensajePlantilla, share);

  const copiar = async (texto: string, tipo: "codigo" | "url") => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(tipo);
      setTimeout(() => setCopiado("none"), 1800);
    } catch {
      // Fallback simple para navegadores viejos
      const tmp = document.createElement("textarea");
      tmp.value = texto;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand("copy");
      document.body.removeChild(tmp);
      setCopiado(tipo);
      setTimeout(() => setCopiado("none"), 1800);
    }
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sage-100/60 blur-3xl" />

      <div className="relative">
        <CardHeader>
          <div className="flex items-center gap-2 text-sage-300">
            <Gift size={16} />
            <span className="label-elegant text-sage-300">Invitá amigos</span>
          </div>
          <CardTitle className="mt-2 text-2xl">
            Boca en boca, huellitas en tu bolsillo
          </CardTitle>
          <CardDescription>
            Cuando un amigo se registre con tu código y haga su primera compra:
            <strong className="ml-1 text-bark-700">
              vos ganás {bonusReferente} huellitas
            </strong>{" "}
            y él/ella suma{" "}
            <strong className="text-bark-700">
              {bonusBienvenida} huellitas de bienvenida
            </strong>
            .
          </CardDescription>
        </CardHeader>

        {/* Boleta del código */}
        <div className="rounded-2xl border border-dashed border-bark-200 bg-cream-50 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-bark-400">
                Tu código personal
              </div>
              <div className="mt-1.5 inline-block max-w-full overflow-hidden">
                <code className="font-display text-3xl font-semibold tracking-[0.16em] text-bark-700">
                  {codigo}
                </code>
              </div>
            </div>
            <button
              type="button"
              onClick={() => copiar(codigo, "codigo")}
              className={cn(
                "btn-ghost inline-flex items-center gap-2 transition",
                copiado === "codigo" && "bg-sage-100 ring-1 ring-sage-200"
              )}
              aria-live="polite"
            >
              {copiado === "codigo" ? (
                <>
                  <Check size={16} /> Copiado
                </>
              ) : (
                <>
                  <Copy size={16} /> Copiar código
                </>
              )}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-bark-100 pt-4">
            <span className="text-xs text-[color:var(--muted)] truncate max-w-full">
              {url}
            </span>
            <button
              type="button"
              onClick={() => copiar(url, "url")}
              className="ml-auto text-xs font-semibold text-bark-500 hover:text-bark-700 inline-flex items-center gap-1"
            >
              {copiado === "url" ? <Check size={12} /> : <Copy size={12} />}
              {copiado === "url" ? "Copiado" : "Copiar link"}
            </button>
          </div>
        </div>

        {/* Acciones de compartir */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
          >
            <WhatsAppIcon /> Compartir por WhatsApp
          </a>
          <button
            type="button"
            onClick={() =>
              navigator.share?.({
                title: nombreLocal,
                text: previewMensaje,
                url
              }).catch(() => {/* cancelado */})
            }
            className="btn-ghost inline-flex items-center justify-center gap-2"
          >
            <Send size={16} /> Compartir por otro medio
          </button>
        </div>

        {/* Preview del mensaje */}
        <div className="mt-5 rounded-xl bg-white/70 p-4 ring-1 ring-bark-100">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-bark-400">
            <Sparkles size={10} />
            Mensaje que vamos a enviar
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-bark-500">
            {previewMensaje}
          </p>
        </div>

        {/* Stats */}
        {stats ? (
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-bark-100 pt-5">
            <Stat
              icon={<Users size={14} />}
              label="Invitaste"
              value={formatNumber(stats.referidosTotales)}
            />
            <Stat
              icon={<Check size={14} />}
              label="Activos"
              value={formatNumber(stats.referidosActivados)}
            />
            <Stat
              icon={<HuellitaIcon size={14} className="text-bark-400" />}
              label="Huellitas ganadas"
              value={formatNumber(stats.huellitasGanadas)}
            />
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-cream-50 p-3 text-center">
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-bark-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-semibold text-bark-700">
        {value}
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.05 4.91A10 10 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.93 9.93 0 0 0 4.78 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.02M12.04 20.08h-.01a8.16 8.16 0 0 1-4.16-1.14l-.3-.18-3.11.82.83-3.04-.2-.31a8.13 8.13 0 0 1-1.25-4.32c0-4.49 3.66-8.16 8.16-8.16 2.18 0 4.23.85 5.77 2.4a8.1 8.1 0 0 1 2.39 5.77c0 4.5-3.65 8.16-8.12 8.16m4.47-6.11c-.24-.12-1.45-.71-1.67-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.78.95-.14.16-.29.18-.53.06-.24-.12-1.03-.38-1.97-1.21-.73-.65-1.22-1.45-1.36-1.7-.14-.24-.02-.37.1-.5.1-.1.24-.27.36-.4.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42-.14-.01-.3-.01-.46-.01-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.31.98 2.47.12.16 1.69 2.59 4.1 3.63.57.25 1.02.39 1.37.5.58.18 1.1.16 1.51.1.46-.07 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28" />
    </svg>
  );
}
