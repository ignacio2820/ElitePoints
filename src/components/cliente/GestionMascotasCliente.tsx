"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PawPrint } from "lucide-react";
import { SelectTipoMascota } from "@/components/ui/SelectTipoMascota";
import {
  labelTipoMascota,
  resolverEspecieMascota,
  type TipoMascotaValor
} from "@/lib/huellitas/tiposMascota";
import { BadgeCumpleanosMascota } from "@/components/cliente/BadgeCumpleanosMascota";
import type { Mascota } from "@/lib/huellitas/types";

type Props = {
  mascotasIniciales: Mascota[];
};

const MENSAJE_SOPORTE =
  "¿Hubo un error en el nombre o la fecha de nacimiento? Solicitá la modificación al personal del local.";

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const inputReadOnly =
  "mt-2 w-full cursor-not-allowed rounded-xl border border-bark-100 bg-cream-50 px-3 py-2.5 text-sm text-bark-600";

const inputEditable =
  "mt-2 w-full rounded-xl border border-bark-200 bg-white px-3 py-2.5 text-sm text-bark-800 outline-none ring-terracotta-400/30 transition focus:border-terracotta-400 focus:ring-2";

const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-bark-500";

function FichaMascotaEditable({
  mascota,
  onActualizada
}: {
  mascota: Mascota;
  onActualizada: (m: Mascota) => void;
}) {
  const router = useRouter();
  const especie = resolverEspecieMascota(mascota);
  const tipoLabel = labelTipoMascota(mascota.tipo, especie);

  const [raza, setRaza] = useState(mascota.raza ?? "");
  const [color, setColor] = useState(mascota.color ?? "");
  const [pesoKg, setPesoKg] = useState(
    mascota.pesoKg != null ? String(mascota.pesoKg) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const onGuardarCambios = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!mascota.id) return;
      setError(null);

      let peso: number | undefined;
      if (pesoKg.trim()) {
        peso = Number(pesoKg.replace(",", "."));
        if (!Number.isFinite(peso) || peso <= 0 || peso > 300) {
          setError("El peso debe ser un número entre 0 y 300 kg.");
          return;
        }
      }

      setGuardando(true);
      try {
        const res = await fetch("/api/cliente/mascotas", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mascotaId: mascota.id,
            raza: raza.trim() || undefined,
            color: color.trim() || undefined,
            pesoKg: peso
          })
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          mascota?: Mascota;
        };
        if (!res.ok || !data.ok || !data.mascota) {
          setError(data.error ?? "No se pudieron guardar los cambios.");
          return;
        }
        onActualizada(data.mascota);
        router.refresh();
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
      } finally {
        setGuardando(false);
      }
    },
    [mascota.id, raza, color, pesoKg, onActualizada, router]
  );

  return (
    <form
      onSubmit={onGuardarCambios}
      className="surface-card space-y-4 rounded-2xl p-5"
    >
      <div className="flex items-center gap-3 border-b border-bark-100 pb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-terracotta-50 text-terracotta-500">
          <PawPrint size={20} />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-bark-700">
            Ficha de mascota
          </h3>
          <p className="text-sm text-bark-500">
            Podés actualizar raza, color y peso
          </p>
        </div>
      </div>

      <div>
        <label className={labelClass}>Nombre de la mascota</label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={mascota.nombre}
            readOnly
            disabled
            className={`${inputReadOnly} min-w-[8rem] flex-1`}
          />
          <BadgeCumpleanosMascota mascota={mascota} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Tipo de mascota</label>
        <input
          type="text"
          value={tipoLabel}
          readOnly
          disabled
          className={inputReadOnly}
        />
      </div>

      <div>
        <label htmlFor={`raza-${mascota.id}`} className={labelClass}>
          Raza
        </label>
        <input
          id={`raza-${mascota.id}`}
          type="text"
          value={raza}
          onChange={(e) => setRaza(e.target.value)}
          maxLength={80}
          placeholder="Ej: Labrador"
          className={inputEditable}
        />
      </div>

      <div>
        <label htmlFor={`color-${mascota.id}`} className={labelClass}>
          Color
        </label>
        <input
          id={`color-${mascota.id}`}
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          maxLength={40}
          placeholder="Ej: Negro y blanco"
          className={inputEditable}
        />
      </div>

      <div>
        <label htmlFor={`peso-${mascota.id}`} className={labelClass}>
          Peso (kg)
        </label>
        <input
          id={`peso-${mascota.id}`}
          type="number"
          inputMode="decimal"
          min={0.1}
          max={300}
          step={0.1}
          value={pesoKg}
          onChange={(e) => setPesoKg(e.target.value)}
          placeholder="Ej: 12.5"
          className={inputEditable}
        />
      </div>

      <div>
        <label className={labelClass}>Fecha de nacimiento</label>
        <input
          type="date"
          value={mascota.fechaNacimiento}
          readOnly
          disabled
          className={inputReadOnly}
        />
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={guardando}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-bark-200 bg-white px-4 py-3 text-sm font-semibold text-bark-700 shadow-sm transition hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {guardando ? <Loader2 size={18} className="animate-spin" /> : null}
        Guardar cambios
      </button>

      <p className="text-xs leading-relaxed text-bark-500">{MENSAJE_SOPORTE}</p>
    </form>
  );
}

export function GestionMascotasCliente({ mascotasIniciales }: Props) {
  const router = useRouter();
  const [mascotas, setMascotas] = useState<Mascota[]>(mascotasIniciales);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoMascotaValor>("perro");
  const [raza, setRaza] = useState("");
  const [color, setColor] = useState("");
  const [pesoKg, setPesoKg] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const puedeAgregar = mascotas.length === 0;

  const onAgregar = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const nombreTrim = nombre.trim();
      if (!nombreTrim) {
        setError("El nombre de la mascota es obligatorio.");
        return;
      }
      if (!tipo) {
        setError("Seleccioná el tipo de mascota.");
        return;
      }
      if (!fechaNacimiento) {
        setError("La fecha de nacimiento es obligatoria.");
        return;
      }
      if (fechaNacimiento > hoyIso()) {
        setError("La fecha de nacimiento no puede ser futura.");
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

      setEnviando(true);
      try {
        const res = await fetch("/api/cliente/mascotas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nombreTrim,
            especie: tipo,
            fechaNacimiento,
            raza: raza.trim() || undefined,
            color: color.trim() || undefined,
            pesoKg: peso
          })
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          mascota?: Mascota;
        };
        if (!res.ok || !data.ok || !data.mascota) {
          setError(data.error ?? "No se pudo guardar la mascota.");
          return;
        }
        setMascotas([data.mascota]);
        router.refresh();
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
      } finally {
        setEnviando(false);
      }
    },
    [nombre, tipo, raza, color, pesoKg, fechaNacimiento, router]
  );

  return (
    <section className="space-y-4">
      <div className="px-1">
        <h2 className="font-display text-lg font-semibold tracking-tight text-bark-700">
          Mis mascotas
        </h2>
        <p className="mt-1 text-sm text-bark-500">
          Registrá a tu compañero para beneficios de cumpleaños. El nombre y la
          fecha de nacimiento quedan fijos después del primer guardado; podés
          actualizar raza, color y peso cuando quieras.
        </p>
      </div>

      {mascotas.map((m) => (
        <FichaMascotaEditable
          key={m.id ?? m.nombre}
          mascota={m}
          onActualizada={(actualizada) =>
            setMascotas((prev) =>
              prev.map((x) => (x.id === actualizada.id ? actualizada : x))
            )
          }
        />
      ))}

      {puedeAgregar ? (
        <form
          onSubmit={onAgregar}
          className="surface-card space-y-4 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-terracotta-50 text-terracotta-500">
              <PawPrint size={20} />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-bark-700">
                Agregar mascota
              </h3>
              <p className="text-sm text-bark-500">
                Completá todos los campos obligatorios.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="mascota-nombre" className={labelClass}>
              Nombre de la mascota
            </label>
            <input
              id="mascota-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={60}
              required
              placeholder="Ej: Luna"
              className={inputEditable}
            />
          </div>

          <div>
            <label htmlFor="mascota-tipo" className={labelClass}>
              Tipo de mascota
            </label>
            <SelectTipoMascota
              id="mascota-tipo"
              value={tipo}
              onChange={setTipo}
            />
          </div>

          <div>
            <label htmlFor="mascota-raza" className={labelClass}>
              Raza
            </label>
            <input
              id="mascota-raza"
              type="text"
              value={raza}
              onChange={(e) => setRaza(e.target.value)}
              maxLength={80}
              placeholder="Ej: Labrador"
              className={inputEditable}
            />
          </div>

          <div>
            <label htmlFor="mascota-color" className={labelClass}>
              Color
            </label>
            <input
              id="mascota-color"
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              maxLength={40}
              placeholder="Ej: Negro y blanco"
              className={inputEditable}
            />
          </div>

          <div>
            <label htmlFor="mascota-peso" className={labelClass}>
              Peso (kg)
            </label>
            <input
              id="mascota-peso"
              type="number"
              inputMode="decimal"
              min={0.1}
              max={300}
              step={0.1}
              value={pesoKg}
              onChange={(e) => setPesoKg(e.target.value)}
              placeholder="Ej: 12.5"
              className={inputEditable}
            />
          </div>

          <div>
            <label htmlFor="mascota-fecha" className={labelClass}>
              Fecha de nacimiento
            </label>
            <input
              id="mascota-fecha"
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              max={hoyIso()}
              required
              className={inputEditable}
            />
            <p className="mt-2 text-xs text-bark-500">
              Una vez guardada, esta fecha no podrá editarse.
            </p>
          </div>

          {error ? (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={enviando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-bark-600 to-terracotta-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? <Loader2 size={18} className="animate-spin" /> : null}
            Guardar mascota
          </button>
        </form>
      ) : null}
    </section>
  );
}
