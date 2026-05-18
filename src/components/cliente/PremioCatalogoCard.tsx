"use client";

import Image from "next/image";
import { Bone, Gift, Loader2, Lock, Package, Stethoscope } from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import type { PremioAumentado } from "@/lib/huellitas/engine";
import { formatNumber } from "@/lib/utils";

function iconoPremio(categoria?: string) {
  switch (categoria) {
    case "servicio":
      return Stethoscope;
    case "juguete":
      return Bone;
    case "alimento":
      return Package;
    default:
      return Gift;
  }
}

export function etiquetaCategoriaPremio(categoria?: string): string {
  switch (categoria) {
    case "alimento":
      return "Alimento";
    case "juguete":
      return "Juguete";
    case "accesorio":
      return "Accesorio";
    case "servicio":
      return "Servicios";
    default:
      return "Premios";
  }
}

interface Props {
  item: PremioAumentado;
  pidiendo: boolean;
  onCanjear: () => void;
}

export function PremioCatalogoCard({ item, pidiendo, onCanjear }: Props) {
  const { premio, desbloqueado, motivo, nivelMinimo, faltanHuellitas } = item;
  const Icono = iconoPremio(premio.categoria);
  const imagen = premio.imagen?.trim();

  let accion: React.ReactNode;
  if (desbloqueado) {
    accion = (
      <button
        type="button"
        onClick={onCanjear}
        disabled={pidiendo}
        className="mt-3 w-full rounded-full bg-terracotta-400 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-terracotta-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pidiendo ? (
          <span className="inline-flex items-center justify-center gap-1.5">
            <Loader2 size={14} className="animate-spin" />
            Generando…
          </span>
        ) : (
          "Canjear"
        )}
      </button>
    );
  } else if (motivo === "saldo") {
    accion = (
      <p className="mt-3 text-center text-[11px] font-semibold text-bark-500">
        Te faltan {formatNumber(faltanHuellitas)} huellitas
      </p>
    );
  } else if (motivo === "nivel" && nivelMinimo) {
    accion = (
      <p className="mt-3 inline-flex w-full items-center justify-center gap-1 text-center text-[11px] font-semibold text-bark-500">
        <Lock size={12} />
        Nivel {nivelMinimo.nombre}
      </p>
    );
  } else if (motivo === "stock") {
    accion = (
      <p className="mt-3 text-center text-[11px] font-semibold text-bark-500">
        Sin stock
      </p>
    );
  } else {
    accion = (
      <p className="mt-3 text-center text-[11px] font-semibold text-bark-500">
        No disponible
      </p>
    );
  }

  return (
    <article
      className={`relative flex flex-col rounded-xl border border-bark-100 bg-white p-3 shadow-sm ${
        desbloqueado ? "" : "opacity-90"
      }`}
    >
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
        <HuellitaIcon size={12} className="text-white" />
        {formatNumber(premio.costoHuellitas)}
      </div>

      <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-lg bg-cream-50 p-2">
        {imagen ? (
          <Image
            src={imagen}
            alt=""
            width={160}
            height={128}
            className="h-full w-full object-contain"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-bark-300">
            <Icono size={36} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-bark-800">
          {premio.nombre}
        </h3>
        {premio.descripcion?.trim() ? (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-bark-500">
            {premio.descripcion.trim()}
          </p>
        ) : null}
        <p className="mt-1 text-xs font-medium text-bark-400">
          {etiquetaCategoriaPremio(premio.categoria)}
        </p>
        {accion}
      </div>
    </article>
  );
}
