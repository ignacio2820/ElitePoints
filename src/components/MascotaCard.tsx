"use client";

import { Cake, PawPrint } from "lucide-react";
import { edadMascotaAnios, esCumpleanos } from "@/lib/huellitas/engine";
import type { Mascota } from "@/lib/huellitas/types";
import { Badge } from "@/components/ui/Badge";

import { labelTipoMascota, resolverEspecieMascota } from "@/lib/huellitas/tiposMascota";

const especieEmoji: Record<Mascota["especie"], string> = {
  perro: "🐶",
  gato: "🐱",
  ave: "🐦",
  roedor: "🐹",
  reptil: "🦎",
  otro: "🐾"
};

export function MascotaCard({ mascota }: { mascota: Mascota }) {
  const especie = resolverEspecieMascota(mascota);
  const edad = edadMascotaAnios(mascota);
  const cumple = esCumpleanos(mascota);

  return (
    <div className="surface-card p-5 transition hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cream-100 text-3xl">
          <span aria-hidden>{especieEmoji[especie]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-display text-xl font-semibold text-bark-700 truncate">
              {mascota.nombre}
            </h4>
            {cumple ? (
              <Badge tone="ajustado">
                <Cake size={12} /> ¡Cumple hoy!
              </Badge>
            ) : null}
          </div>
          <div className="mt-1 text-sm text-[color:var(--muted)]">
            {labelTipoMascota(mascota.tipo, especie)}
            {mascota.raza ? ` · ${mascota.raza}` : ""}
            {" · "}
            {edad === 0 ? "Recién nacido" : `${edad} ${edad === 1 ? "año" : "años"}`}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-bark-400">
            <PawPrint size={12} />
            Nacimiento: {formatFecha(mascota.fechaNacimiento)}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
