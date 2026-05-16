"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { NivelLealtad, Premio } from "@/lib/huellitas/types";
import {
  resolverUrlImagenPremio,
  subirImagenPremioPorApi
} from "@/lib/admin/premioImagenUpload";
import { withTimeout } from "@/lib/async/withTimeout";
import { Field } from "@/components/ui/Field";

const MS_GUARDAR_PREMIO = 30_000;

async function parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) {
    return { ok: false, error: `Respuesta vacía del servidor (${res.status}).` };
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { ok: false, error: `Respuesta inválida del servidor (${res.status}).` };
  }
}

export interface PremioFormValues {
  nombre: string;
  descripcion: string;
  costoHuellitas: number;
  valorDescuento: number | null;
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
  const { sesion } = useAuth();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [costoHuellitas, setCostoHuellitas] = useState("");
  const [valorDescuento, setValorDescuento] = useState("");
  const [stock, setStock] = useState("");
  const [nivelMinimoId, setNivelMinimoId] = useState("");
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewBlobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
        previewBlobRef.current = null;
      }
      return;
    }
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
    setNombre(initial?.nombre ?? "");
    setDescripcion(initial?.descripcion ?? "");
    setCostoHuellitas(
      initial?.costoHuellitas ? String(initial.costoHuellitas) : ""
    );
    setValorDescuento(
      typeof initial?.valorDescuento === "number"
        ? String(initial.valorDescuento)
        : ""
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
    if (guardando) return;

    setGuardando(true);
    setError(null);

    const localId = sesion?.claims.localId;
    if (!localId) {
      setError("No hay sesión de administrador activa.");
      setGuardando(false);
      return;
    }

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

      let valorDescuentoValue: number | null = null;
      if (valorDescuento.trim() !== "") {
        const v = Number(valorDescuento);
        if (!Number.isFinite(v) || v < 0) {
          throw new Error("El valor del descuento debe ser un número ≥ 0.");
        }
        valorDescuentoValue = Math.round(v * 100) / 100;
      }

      const payloadBase = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        costoHuellitas: Math.floor(costo),
        valorDescuento: valorDescuentoValue,
        stock: stockValue,
        nivelMinimoId: nivelMinimoId.trim() || null
      };

      /** a) Storage (uploadBytes + getDownloadURL) → b) URL en payload → c) POST/PATCH premio */
      let imagenUrl: string | undefined;
      if (imagenFile) {
        try {
          imagenUrl = await resolverUrlImagenPremio({
            localId,
            imagenFile
          });
        } catch (errStorage) {
          if (initial?.id) {
            throw errStorage instanceof Error
              ? errStorage
              : new Error("No pudimos subir la imagen.");
          }
          /* Premio nuevo: guardamos datos primero y subimos imagen por API con Admin SDK. */
        }
      }

      const payload =
        imagenUrl !== undefined
          ? { ...payloadBase, imagen: imagenUrl }
          : payloadBase;

      const endpoint = initial?.id
        ? `/api/admin/premios/${initial.id}`
        : "/api/admin/premios";
      const method = initial?.id ? "PATCH" : "POST";

      const res = await withTimeout(
        fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload)
        }),
        MS_GUARDAR_PREMIO,
        "Guardar el premio tardó demasiado."
      );

      const data = await parseJsonResponse(res);
      if (!res.ok || data.ok !== true) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "No pudimos guardar el premio."
        );
      }

      let premio = data.premio as Premio;
      if (!premio?.id) {
        throw new Error("El servidor no devolvió el premio guardado.");
      }

      if (imagenFile && !imagenUrl) {
        const { premio: actualizado } = await subirImagenPremioPorApi(
          premio.id,
          imagenFile
        );
        premio = actualizado as Premio;
      }

      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
        previewBlobRef.current = null;
      }
      setImagenPreview(premio.imagen ?? null);
      setImagenFile(null);

      onSaved(premio);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el premio.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-overlay p-4 sm:items-center">
      <div className="modal-panel max-w-lg">
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

            <Field
              label="Valor del descuento ($)"
              hint="Lo que descuenta este premio al canjearse. Vacío = se calcula automático con la configuración del local."
            >
              <input
                className="input-elegant"
                type="number"
                min={0}
                step="0.01"
                value={valorDescuento}
                onChange={(e) => setValorDescuento(e.target.value)}
                placeholder="Ej: 2500"
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
            <label className="group relative flex min-h-[148px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-neutral-300 bg-emerald-50/40 px-4 py-6 text-center transition-colors hover:border-[#FB8500]">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setImagenFile(file);
                  if (previewBlobRef.current) {
                    URL.revokeObjectURL(previewBlobRef.current);
                    previewBlobRef.current = null;
                  }
                  if (file) {
                    const u = URL.createObjectURL(file);
                    previewBlobRef.current = u;
                    setImagenPreview(u);
                  } else {
                    setImagenPreview(initial?.imagen ?? null);
                  }
                  e.target.value = "";
                }}
              />
              {imagenPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagenPreview}
                  alt="Vista previa del premio"
                  className="max-h-40 w-full max-w-[200px] rounded-lg border border-bark-100 object-contain shadow-sm"
                />
              ) : (
                <>
                  <Camera
                    className="h-10 w-10 text-neutral-400 transition-colors group-hover:text-[#FB8500]"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span className="max-w-[260px] text-sm font-medium text-neutral-700">
                    Haz clic para subir imagen del premio
                  </span>
                </>
              )}
              {imagenPreview ? (
                <span className="text-xs text-neutral-500 group-hover:text-[#FB8500]">
                  Haz clic para cambiar la imagen
                </span>
              ) : null}
            </label>
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
