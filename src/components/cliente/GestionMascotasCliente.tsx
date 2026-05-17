"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PawPrint, Trash2 } from "lucide-react";
import { MascotaCard } from "@/components/MascotaCard";
import type { Mascota } from "@/lib/huellitas/types";

type Props = {
  mascotasIniciales: Mascota[];
};

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function GestionMascotasCliente({ mascotasIniciales }: Props) {
  const router = useRouter();
  const [mascotas, setMascotas] = useState<Mascota[]>(mascotasIniciales);
  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

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
        setMascotas((prev) => [...prev, data.mascota!]);
        setNombre("");
        setFechaNacimiento("");
        router.refresh();
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
      } finally {
        setEnviando(false);
      }
    },
    [nombre, fechaNacimiento, router]
  );

  const onEliminar = useCallback(
    async (mascota: Mascota) => {
      if (!mascota.id) {
        setError(
          "Esta mascota fue cargada por el local. Pedí en la veterinaria que la actualicen o eliminen."
        );
        return;
      }
      const ok = window.confirm(
        `¿Eliminar a ${mascota.nombre}? Vas a poder registrarla de nuevo con la fecha correcta.`
      );
      if (!ok) return;

      setError(null);
      setEliminandoId(mascota.id);
      try {
        const res = await fetch("/api/cliente/mascotas", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mascotaId: mascota.id })
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          mascotas?: Mascota[];
        };
        if (!res.ok || !data.ok) {
          setError(data.error ?? "No se pudo eliminar la mascota.");
          return;
        }
        setMascotas(data.mascotas ?? []);
        router.refresh();
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
      } finally {
        setEliminandoId(null);
      }
    },
    [router]
  );

  return (
    <section className="space-y-4">
      <div className="px-1">
        <h2 className="font-display text-lg font-semibold tracking-tight text-bark-700">
          Mis mascotas
        </h2>
        <p className="mt-1 text-sm text-bark-500">
          Registrá a tu compañero para beneficios de cumpleaños. La fecha de
          nacimiento queda fija después del primer guardado.
        </p>
      </div>

      {mascotas.length > 0 ? (
        <div className="space-y-4">
          {mascotas.map((m) => (
            <div key={m.id ?? m.nombre} className="space-y-3">
              <MascotaCard mascota={m} />
              <div className="surface-card rounded-2xl p-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-bark-500">
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  value={m.fechaNacimiento}
                  disabled
                  className="mt-2 w-full cursor-not-allowed rounded-xl border border-bark-100 bg-cream-50 px-3 py-2.5 text-sm text-bark-600 opacity-90"
                  aria-describedby={`fecha-bloqueada-${m.id ?? m.nombre}`}
                />
                <p
                  id={`fecha-bloqueada-${m.id ?? m.nombre}`}
                  className="mt-2 text-xs leading-relaxed text-bark-500"
                >
                  La fecha no se puede modificar para proteger los beneficios de
                  cumpleaños. Si te equivocaste, eliminá la mascota y volvé a
                  registrarla.
                </p>
                <button
                  type="button"
                  onClick={() => onEliminar(m)}
                  disabled={eliminandoId === m.id}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {eliminandoId === m.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Eliminar mascota
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

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
                Nombre y fecha de nacimiento son obligatorios.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="mascota-nombre"
              className="text-xs font-semibold uppercase tracking-wide text-bark-500"
            >
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
            <label
              htmlFor="mascota-fecha"
              className="text-xs font-semibold uppercase tracking-wide text-bark-500"
            >
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

      {!puedeAgregar && error ? (
        <p className="px-1 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
