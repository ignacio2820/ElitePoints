"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { FichaMascota } from "@/components/FichaMascota";
import { SelectTipoMascota } from "@/components/ui/SelectTipoMascota";
import { resolverEspecieMascota, type TipoMascotaValor } from "@/lib/huellitas/tiposMascota";
import type { Mascota } from "@/lib/huellitas/types";

type Props = {
  clienteId: string;
  mascotasIniciales: Mascota[];
  soloLectura?: boolean;
};

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-bark-500";

export function GestionMascotasAdmin({
  clienteId,
  mascotasIniciales,
  soloLectura = false
}: Props) {
  const router = useRouter();
  const [mascotas, setMascotas] = useState<Mascota[]>(mascotasIniciales);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarAlta, setMostrarAlta] = useState(false);

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoMascotaValor>("perro");
  const [raza, setRaza] = useState("");
  const [color, setColor] = useState("");
  const [pesoKg, setPesoKg] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  const apiBase = `/api/admin/clientes/${clienteId}/mascotas`;

  const resetForm = () => {
    setNombre("");
    setTipo("perro");
    setRaza("");
    setColor("");
    setPesoKg("");
    setFechaNacimiento("");
    setEditandoId(null);
    setMostrarAlta(false);
  };

  const cargarEnForm = (m: Mascota) => {
    setNombre(m.nombre);
    setTipo(resolverEspecieMascota(m) as TipoMascotaValor);
    setRaza(m.raza ?? "");
    setColor(m.color ?? "");
    setPesoKg(m.pesoKg != null ? String(m.pesoKg) : "");
    setFechaNacimiento(m.fechaNacimiento);
    setEditandoId(m.id ?? null);
    setMostrarAlta(true);
    setError(null);
  };

  const onGuardar = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (soloLectura) return;
      setError(null);

      const nombreTrim = nombre.trim();
      if (!nombreTrim || !tipo || !fechaNacimiento) {
        setError("Completá nombre, tipo y fecha de nacimiento.");
        return;
      }
      if (fechaNacimiento > hoyIso()) {
        setError("La fecha no puede ser futura.");
        return;
      }

      let peso: number | undefined;
      if (pesoKg.trim()) {
        peso = Number(pesoKg.replace(",", "."));
        if (!Number.isFinite(peso) || peso <= 0 || peso > 300) {
          setError("El peso debe ser un número entre 0 y 300 kg.");
          return;
        }
      }

      const camposExtra = {
        raza: raza.trim() || undefined,
        color: color.trim() || undefined,
        pesoKg: peso
      };

      setGuardando(true);
      try {
        const esEdicion = !!editandoId;
        const res = await fetch(apiBase, {
          method: esEdicion ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(
            esEdicion
              ? {
                  mascotaId: editandoId,
                  nombre: nombreTrim,
                  especie: tipo,
                  fechaNacimiento,
                  ...camposExtra
                }
              : {
                  nombre: nombreTrim,
                  especie: tipo,
                  fechaNacimiento,
                  ...camposExtra
                }
          )
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          mascota?: Mascota;
          mascotas?: Mascota[];
        };
        if (!res.ok || !data.ok) {
          setError(data.error ?? "No se pudo guardar.");
          return;
        }
        if (esEdicion && data.mascotas) {
          setMascotas(data.mascotas);
        } else if (data.mascota) {
          setMascotas((prev) => [...prev, data.mascota!]);
        }
        resetForm();
        router.refresh();
      } catch {
        setError("Error de conexión.");
      } finally {
        setGuardando(false);
      }
    },
    [soloLectura, nombre, tipo, raza, color, pesoKg, fechaNacimiento, editandoId, apiBase, router]
  );

  const onEliminar = useCallback(
    async (mascota: Mascota) => {
      if (soloLectura || !mascota.id) return;
      const ok = window.confirm(
        `¿Eliminar a ${mascota.nombre}? Esta acción no se puede deshacer.`
      );
      if (!ok) return;

      setGuardando(true);
      setError(null);
      try {
        const res = await fetch(apiBase, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ mascotaId: mascota.id })
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          mascotas?: Mascota[];
        };
        if (!res.ok || !data.ok) {
          setError(data.error ?? "No se pudo eliminar.");
          return;
        }
        setMascotas(data.mascotas ?? []);
        if (editandoId === mascota.id) resetForm();
        router.refresh();
      } catch {
        setError("Error de conexión.");
      } finally {
        setGuardando(false);
      }
    },
    [soloLectura, apiBase, editandoId, router]
  );

  return (
    <div className="space-y-4">
      {!soloLectura && !mostrarAlta ? (
        <button
          type="button"
          onClick={() => {
            resetForm();
            setMostrarAlta(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-bark-200 bg-white px-4 py-2.5 text-sm font-semibold text-bark-700 shadow-sm transition hover:bg-cream-50"
        >
          <Plus size={16} />
          Agregar mascota
        </button>
      ) : null}

      {!soloLectura && mostrarAlta ? (
        <form
          onSubmit={onGuardar}
          className="rounded-2xl border border-bark-100 bg-cream-50/80 p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-bark-700">
              {editandoId ? "Editar mascota" : "Nueva mascota"}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-2 text-bark-400 hover:bg-white"
              aria-label="Cerrar formulario"
            >
              <X size={16} />
            </button>
          </div>

          <div>
            <label htmlFor="admin-mascota-nombre" className={labelClass}>
              Nombre
            </label>
            <input
              id="admin-mascota-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={60}
              required
              className="mt-2 w-full rounded-xl border border-bark-200 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="admin-mascota-tipo" className={labelClass}>
              Tipo de mascota
            </label>
            <SelectTipoMascota
              id="admin-mascota-tipo"
              value={tipo}
              onChange={setTipo}
            />
          </div>


          <div>
            <label htmlFor="admin-mascota-raza" className={labelClass}>
              Raza
            </label>
            <input
              id="admin-mascota-raza"
              value={raza}
              onChange={(e) => setRaza(e.target.value)}
              maxLength={80}
              placeholder="Ej: Labrador"
              className="mt-2 w-full rounded-xl border border-bark-200 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="admin-mascota-color" className={labelClass}>
              Color
            </label>
            <input
              id="admin-mascota-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              maxLength={40}
              placeholder="Ej: Negro y blanco"
              className="mt-2 w-full rounded-xl border border-bark-200 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="admin-mascota-peso" className={labelClass}>
              Peso (kg)
            </label>
            <input
              id="admin-mascota-peso"
              type="number"
              inputMode="decimal"
              min={0.1}
              max={300}
              step={0.1}
              value={pesoKg}
              onChange={(e) => setPesoKg(e.target.value)}
              placeholder="Ej: 12.5"
              className="mt-2 w-full rounded-xl border border-bark-200 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="admin-mascota-fecha" className={labelClass}>
              Fecha de nacimiento
            </label>
            <input
              id="admin-mascota-fecha"
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              max={hoyIso()}
              required
              className="mt-2 w-full rounded-xl border border-bark-200 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={guardando}
            className="inline-flex items-center gap-2 rounded-xl bg-bark-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {guardando ? <Loader2 size={16} className="animate-spin" /> : null}
            {editandoId ? "Guardar cambios" : "Registrar mascota"}
          </button>
        </form>
      ) : null}

      {mascotas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-bark-200 p-8 text-center text-sm text-[color:var(--muted)]">
          Este cliente todavía no tiene mascotas registradas.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {mascotas.map((m) => (
            <div key={m.id ?? m.nombre} className="space-y-2">
              <FichaMascota mascota={m} />
              {!soloLectura && m.id ? (
                <div className="flex flex-wrap gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => cargarEnForm(m)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-bark-200 bg-white px-3 py-2 text-xs font-semibold text-bark-700 hover:bg-cream-50"
                  >
                    <Pencil size={14} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onEliminar(m)}
                    disabled={guardando}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {soloLectura && error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
