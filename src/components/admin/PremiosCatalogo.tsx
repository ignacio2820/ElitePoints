"use client";

import { useMemo, useState } from "react";
import { Gift, Pencil, Plus, Trash2 } from "lucide-react";
import type { NivelLealtad, Premio } from "@/lib/huellitas/types";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { formatNumber } from "@/lib/utils";
import { PremioFormModal } from "./PremioFormModal";

interface Props {
  initialPremios: Premio[];
  niveles: NivelLealtad[];
}

export function PremiosCatalogo({ initialPremios, niveles }: Props) {
  const [premios, setPremios] = useState(initialPremios);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Premio | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nivelesPorId = useMemo(
    () => new Map(niveles.map((nivel) => [nivel.id, nivel.nombre])),
    [niveles]
  );

  function abrirNuevo() {
    setEditando(null);
    setModalAbierto(true);
  }

  function abrirEditar(premio: Premio) {
    setEditando(premio);
    setModalAbierto(true);
  }

  async function eliminar(premio: Premio) {
    if (!premio.id) return;
    if (!window.confirm(`¿Eliminar "${premio.nombre}" del catálogo?`)) return;
    setError(null);
    const res = await fetch(`/api/admin/premios/${premio.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data.error ?? "No pudimos eliminar el premio.");
      return;
    }
    setPremios((prev) => prev.filter((p) => p.id !== premio.id));
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[color:var(--muted)]">
          {premios.length} premio{premios.length === 1 ? "" : "s"} en tu catálogo.
        </p>
        <button type="button" onClick={abrirNuevo} className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} />
          Nuevo premio
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {premios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-bark-200 bg-cream-50/70 px-6 py-12 text-center">
          <Gift className="mx-auto text-bark-300" size={28} />
          <p className="mt-3 font-medium text-bark-700">Todavía no cargaste premios</p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Creá el primero para que tus clientes puedan canjear Huellitas.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {premios.map((premio) => (
            <article
              key={premio.id}
              className="rounded-2xl border border-bark-100 bg-white p-5 shadow-soft"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cream-100 text-bark-400">
                  {premio.imagen ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={premio.imagen}
                      alt={premio.nombre}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Gift size={22} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl font-semibold text-bark-700">
                    {premio.nombre}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-[color:var(--muted)]">
                    {premio.descripcion || "Sin descripción"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-bark-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-2.5 py-1">
                      <HuellitaIcon size={14} />
                      {formatNumber(premio.costoHuellitas)}
                    </span>
                    <span className="rounded-full bg-cream-100 px-2.5 py-1">
                      Stock: {premio.stock === null ? "Ilimitado" : formatNumber(premio.stock)}
                    </span>
                    <span className="rounded-full bg-cream-100 px-2.5 py-1">
                      Nivel: {nivelesPorId.get(premio.nivelMinimoId) ?? "Cachorro"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => abrirEditar(premio)}
                  className="btn-ghost inline-flex items-center gap-1.5 text-sm"
                >
                  <Pencil size={14} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(premio)}
                  className="btn-ghost inline-flex items-center gap-1.5 text-sm text-rose-700"
                >
                  <Trash2 size={14} />
                  Borrar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <PremioFormModal
        open={modalAbierto}
        niveles={niveles}
        initial={editando}
        onClose={() => setModalAbierto(false)}
        onSaved={(premio) => {
          setPremios((prev) => {
            const idx = prev.findIndex((p) => p.id === premio.id);
            if (idx === -1) return [...prev, premio].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
            const next = [...prev];
            next[idx] = premio;
            return next.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
          });
        }}
      />
    </div>
  );
}
