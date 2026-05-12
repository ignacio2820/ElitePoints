"use client";

import { useState } from "react";
import { Lock, Sparkles, Tag } from "lucide-react";
import type { NivelLealtad, Premio } from "@/lib/huellitas/types";
import { aumentarCatalogo, type PremioAumentado } from "@/lib/huellitas/engine";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { NivelBadge } from "@/components/NivelBadge";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { cn, formatNumber } from "@/lib/utils";

const categorias = [
  { id: "todos", label: "Todos" },
  { id: "alimento", label: "Alimento" },
  { id: "juguete", label: "Juguete" },
  { id: "accesorio", label: "Accesorio" },
  { id: "servicio", label: "Servicio" }
] as const;

type Filtro = (typeof categorias)[number]["id"];

export interface CatalogoPremiosProps {
  premios: Premio[];
  saldoCliente: number;
  nivelCliente: NivelLealtad;
  niveles: NivelLealtad[];
  especiesCliente?: string[];
  onCanjear?: (premio: Premio) => void;
}

export function CatalogoPremios({
  premios,
  saldoCliente,
  nivelCliente,
  niveles,
  especiesCliente,
  onCanjear
}: CatalogoPremiosProps) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [soloDisponibles, setSoloDisponibles] = useState(false);

  const aumentado = aumentarCatalogo(premios, {
    saldoCliente,
    nivelCliente,
    niveles,
    especiesCliente
  });

  const visibles = aumentado.filter((p) => {
    if (filtro !== "todos" && p.premio.categoria !== filtro) return false;
    if (soloDisponibles && !p.desbloqueado) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-bark-400">
              <Sparkles size={16} />
              <span className="label-elegant">Catálogo de premios</span>
            </div>
            <CardTitle className="mt-2 text-xl">Canjeá tus huellitas</CardTitle>
            <CardDescription>
              Seleccioná un premio. Algunos están reservados para rangos
              superiores: subí de nivel para desbloquearlos.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {categorias.map((c) => (
          <button
            key={c.id}
            onClick={() => setFiltro(c.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              filtro === c.id
                ? "bg-bark-700 text-cream-50"
                : "bg-cream-100 text-bark-500 hover:bg-cream-200"
            )}
          >
            {c.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-bark-500">
          <input
            type="checkbox"
            checked={soloDisponibles}
            onChange={(e) => setSoloDisponibles(e.target.checked)}
            className="h-4 w-4 accent-bark-400"
          />
          Sólo disponibles para mí
        </label>
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-bark-200 p-8 text-center text-sm text-[color:var(--muted)]">
          No encontramos premios con ese filtro.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibles.map((p) => (
            <PremioTile
              key={p.premio.id ?? p.premio.nombre}
              item={p}
              onCanjear={onCanjear}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function PremioTile({
  item,
  onCanjear
}: {
  item: PremioAumentado;
  onCanjear?: (p: Premio) => void;
}) {
  const { premio, desbloqueado, motivo, nivelMinimo, faltanHuellitas } = item;
  const bloqueadoPorNivel = motivo === "nivel";

  return (
    <div
      className={cn(
        "group relative overflow-hidden surface-card p-5 transition",
        desbloqueado ? "hover:-translate-y-0.5 hover:shadow-soft" : "opacity-95"
      )}
    >
      {!desbloqueado ? (
        <div className="absolute inset-0 bg-gradient-to-br from-cream-50/40 to-cream-100/30 backdrop-blur-[1px]" />
      ) : null}

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-bark-400">
              <Tag size={11} /> {premio.categoria}
            </div>
            <h4 className="mt-1.5 font-display text-lg font-semibold text-bark-700">
              {premio.nombre}
            </h4>
            {premio.descripcion ? (
              <p className="mt-1 text-sm leading-relaxed text-[color:var(--muted)]">
                {premio.descripcion}
              </p>
            ) : null}
          </div>

          {bloqueadoPorNivel && nivelMinimo ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-100 ring-1 ring-bark-100">
              <Lock size={14} className="text-bark-500" />
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 font-display text-2xl font-semibold text-bark-700">
              {formatNumber(premio.costoHuellitas)}
              <HuellitaIcon size={16} className="text-bark-400" />
            </div>
            {nivelMinimo && nivelMinimo.id !== "cachorro" ? (
              <div className="mt-2">
                <NivelBadge nivel={nivelMinimo} size="sm" />
              </div>
            ) : null}
          </div>

          {desbloqueado ? (
            <button
              onClick={() => onCanjear?.(premio)}
              className="btn-primary text-sm"
            >
              Canjear
            </button>
          ) : (
            <BloqueoLabel
              motivo={motivo}
              faltanHuellitas={faltanHuellitas}
              nivelMinimo={nivelMinimo}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function BloqueoLabel({
  motivo,
  faltanHuellitas,
  nivelMinimo
}: {
  motivo: PremioAumentado["motivo"];
  faltanHuellitas: number;
  nivelMinimo?: NivelLealtad;
}) {
  if (motivo === "nivel" && nivelMinimo) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-cream-100 px-3 py-1.5 text-xs font-medium text-bark-500">
        <Lock size={12} /> Subí a {nivelMinimo.nombre}
      </span>
    );
  }
  if (motivo === "saldo") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-cream-100 px-3 py-1.5 text-xs font-medium text-bark-500">
        Te faltan {formatNumber(faltanHuellitas)} 🐾
      </span>
    );
  }
  if (motivo === "stock") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-cream-100 px-3 py-1.5 text-xs font-medium text-bark-500">
        Sin stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-cream-100 px-3 py-1.5 text-xs font-medium text-bark-500">
      No disponible
    </span>
  );
}

/** Set de premios DEMO para usar cuando no hay backend conectado. */
export const PREMIOS_DEMO: Premio[] = [
  {
    localId: "demo",
    nombre: "Pelota interactiva",
    descripcion: "Goma natural resistente. Ideal para juegos de inteligencia.",
    costoHuellitas: 80,
    nivelMinimoId: "cachorro",
    categoria: "juguete",
    stock: null,
    activo: true,
    especiesObjetivo: ["perro"]
  },
  {
    localId: "demo",
    nombre: "Bolsa de premios gourmet",
    descripcion: "Snacks horneados con receta veterinaria, sin conservantes.",
    costoHuellitas: 200,
    nivelMinimoId: "explorador",
    categoria: "alimento",
    stock: 12,
    activo: true,
    especiesObjetivo: []
  },
  {
    localId: "demo",
    nombre: "Collar premium grabado",
    descripcion: "Cuero vegetal con chapa grabada con el nombre de tu mascota.",
    costoHuellitas: 320,
    nivelMinimoId: "explorador",
    categoria: "accesorio",
    stock: null,
    activo: true,
    especiesObjetivo: []
  },
  {
    localId: "demo",
    nombre: "Sesión de spa canino",
    descripcion: "Baño, cepillado y corte por nuestro equipo de groomers.",
    costoHuellitas: 500,
    nivelMinimoId: "gran-guardian",
    categoria: "servicio",
    stock: null,
    activo: true,
    especiesObjetivo: ["perro"]
  },
  {
    localId: "demo",
    nombre: "Consulta veterinaria",
    descripcion: "Chequeo general con uno de nuestros veterinarios asociados.",
    costoHuellitas: 700,
    nivelMinimoId: "gran-guardian",
    categoria: "servicio",
    stock: 4,
    activo: true,
    especiesObjetivo: []
  }
];
