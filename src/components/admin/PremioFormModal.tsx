"use client";

import { useEffect, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import type { NivelLealtad, Premio } from "@/lib/huellitas/types";
import { comprimirImagenEnCliente } from "@/lib/images/compressImageClient";
import { Field } from "@/components/ui/Field";

export interface PremioFormValues {
  nombre: string;
  descripcion: string;
  costoHuellitas: number;
  stock: number | null;
  nivelMinimoId: string | null;
}

interface Props {
  open: boolean;
  niveles: NivelLealtad[];
  initial?: Premio | null;
  onClose: () => void;
  onSaved: (premio: Premio) => void;
}

export function PremioFormModal({
  open,
  niveles,
  initial,
  onClose,
  onSaved
}: Props) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [costoHuellitas, setCostoHuellitas] = useState("");
  const [stock, setStock] = useState("");
  const [nivelMinimoId, setNivelMinimoId] = useState("");
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNombre(initial?.nombre ?? "");
    setDescripcion(initial?.descripcion ?? "");
    setCostoHuellitas(
      initial?.costoHuellitas ? String(initial.costoHuellitas) : ""
    );
    setStock(
      initial?.stock === null || initial?.stock === undefined
        ? ""
        : String(initial.stock)
    );
    setNivelMinimoId(initial?.nivelMinimoId ?? "");
    setImagenFile(null);
    setImagenPreview(initial?.imagen ?? null);
    setError(null);
  }, [open, initial]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const costo = Number(costoHuellitas);
      if (!Number.isFinite(costo) || costo <= 0) {
        throw new Error("Ingresá un costo válido en Huellitas.");
      }
      const stockValue =
        stock.trim() === "" ? null : Math.max(0, Math.floor(Number(stock)));
      if (stock.trim() !== "" && !Number.isFinite(Number(stock))) {
        throw new Error("El stock debe ser un número entero o vacío.");
      }

      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        costoHuellitas: costo,
        stock: stockValue,
        nivelMinimoId: nivelMinimoId || null
      };

      const endpoint = initial?.id
        ? `/api/admin/premios/${initial.id}`
        : "/api/admin/premios";
      const method = initial?.id ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "No pudimos guardar el premio.");
      }

      let premio: Premio = data.premio;
      if (imagenFile) {
        const comprimida = await comprimirImagenEnCliente(imagenFile);
        const fd = new FormData();
        fd.append("file", comprimida);
        const imgRes = await fetch(`/api/admin/premios/${premio.id}/imagen`, {
          method: "POST",
          body: fd
        });
        const imgData = await imgRes.json();
        if (!imgRes.ok || !imgData.ok) {
          throw new Error(imgData.error ?? "No pudimos subir la imagen.");
        }
        premio = imgData.premio;
      }

      onSaved(premio);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-soft">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="label-elegant">Catálogo</p>
            <h2 className="font-display text-2xl font-semibold text-bark-700">
              {initial ? "Editar premio" : "Nuevo premio"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-bark-400 hover:bg-cream-100 hover:text-bark-700"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nombre del premio">
            <input
              className="input-elegant"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={80}
            />
          </Field>

          <Field label="Descripción">
            <textarea
              className="input-elegant min-h-[96px] resize-y"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={280}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Costo en Huellitas">
              <input
                className="input-elegant"
                type="number"
                min={1}
                step={1}
                value={costoHuellitas}
                onChange={(e) => setCostoHuellitas(e.target.value)}
                required
              />
            </Field>

            <Field label="Stock disponible" hint="Vacío = ilimitado">
              <input
                className="input-elegant"
                type="number"
                min={0}
                step={1}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Nivel mínimo requerido" hint="Opcional">
            <select
              className="input-elegant"
              value={nivelMinimoId}
              onChange={(e) => setNivelMinimoId(e.target.value)}
            >
              <option value="">Sin nivel mínimo</option>
              {niveles.map((nivel) => (
                <option key={nivel.id} value={nivel.id}>
                  {nivel.nombre}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Imagen del premio"
            hint="Se comprime automáticamente antes de subirse."
          >
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn-ghost inline-flex cursor-pointer items-center gap-2">
                <Upload size={16} />
                Elegir imagen
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setImagenFile(file);
                    setImagenPreview(file ? URL.createObjectURL(file) : initial?.imagen ?? null);
                  }}
                />
              </label>
              {imagenPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagenPreview}
                  alt="Vista previa"
                  className="h-16 w-16 rounded-xl border border-bark-100 object-cover"
                />
              ) : null}
            </div>
          </Field>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={guardando}
            className="btn-primary inline-flex w-full items-center justify-center gap-2"
          >
            {guardando ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar premio"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
