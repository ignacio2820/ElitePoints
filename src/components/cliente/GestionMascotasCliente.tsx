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
  "¿Hubo un error en los datos? Solicita la modificación o eliminación directamente al personal en el local.";

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const inputReadOnly =
  "mt-2 w-full cursor-not-allowed rounded-xl border border-bark-100 bg-cream-50 px-3 py-2.5 text-sm text-bark-600";

const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-bark-500";

export function GestionMascotasCliente({ mascotasIniciales }: Props) {
  const router = useRouter();
  const [mascotas, setMascotas] = useState<Mascota[]>(mascotasIniciales);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoMascotaValor>("perro");
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

      setEnviando(true);
      try {
        const res = await fetch("/api/cliente/mascotas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nombreTrim,
            especie: tipo,
            fechaNacimiento
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
    [nombre, tipo, fechaNacimiento, router]
  );

  return (
    <section className="space-y-4">
      <div className="px-1">
        <h2 className="font-display text-lg font-semibold tracking-tight text-bark-700">
          Mis mascotas
        </h2>
        <p className="mt-1 text-sm text-bark-500">
          Registrá a tu compañero para beneficios de cumpleaños. Los datos quedan
          fijos después del primer guardado.
        </p>
      </div>

      {mascotas.map((m) => {
        const especie = resolverEspecieMascota(m);
        const tipoLabel = labelTipoMascota(m.tipo, especie);
        return (
          <div
            key={m.id ?? m.nombre}
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
                <p className="text-sm text-bark-500">Solo lectura</p>
              </div>
            </div>

            <div>
              <label className={labelClass}>Nombre de la mascota</label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={m.nombre}
                  readOnly
                  disabled
                  className={`${inputReadOnly} min-w-[8rem] flex-1`}
                />
                <BadgeCumpleanosMascota mascota={m} />
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
              <label className={labelClass}>Fecha de nacimiento</label>
              <input
                type="date"
                value={m.fechaNacimiento}
                readOnly
                disabled
                className={inputReadOnly}
              />
            </div>

            <p className="text-xs leading-relaxed text-bark-500">{MENSAJE_SOPORTE}</p>
          </div>
        );
      })}

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
              className="mt-2 w-full rounded-xl border border-bark-200 bg-white px-3 py-2.5 text-sm text-bark-800 outline-none ring-terracotta-400/30 transition focus:border-terracotta-400 focus:ring-2"
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
              className="mt-2 w-full rounded-xl border border-bark-200 bg-white px-3 py-2.5 text-sm text-bark-800 outline-none ring-terracotta-400/30 transition focus:border-terracotta-400 focus:ring-2"
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
