"use client";

import { useCallback, useState } from "react";
import { Gift, Loader2, Sparkles, Trophy } from "lucide-react";
import type { NivelLealtad } from "@/lib/huellitas/types";
import type { Sorteo } from "@/lib/huellitas/sorteosTypes";
import { labelFiltroNivel } from "@/lib/huellitas/sorteosUtils";
import { niveleseOrdenados } from "@/lib/huellitas/engine";
import { formatNumber } from "@/lib/utils";

type Props = {
  niveles: NivelLealtad[];
  sorteosIniciales: Sorteo[];
};

export function SorteosAdminPanel({ niveles, sorteosIniciales }: Props) {
  const [sorteos, setSorteos] = useState<Sorteo[]>(sorteosIniciales);
  const [premio, setPremio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imagen, setImagen] = useState("");
  const [fechaHoraFin, setFechaHoraFin] = useState("");
  const [nivelMinimo, setNivelMinimo] = useState("todos");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null);

  const nivelesOrd = niveleseOrdenados(niveles);

  const recargar = useCallback(async () => {
    const res = await fetch("/api/admin/sorteos", { credentials: "same-origin" });
    const data = (await res.json()) as { ok: boolean; sorteos?: Sorteo[] };
    if (data.ok && data.sorteos) setSorteos(data.sorteos);
  }, []);

  const onCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const res = await fetch("/api/admin/sorteos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          premio,
          descripcion,
          imagen: imagen.trim() || undefined,
          fechaHoraFin: new Date(fechaHoraFin).toISOString(),
          nivelMinimo
        })
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudo crear el sorteo.");
        return;
      }
      setPremio("");
      setDescripcion("");
      setImagen("");
      setFechaHoraFin("");
      setNivelMinimo("todos");
      await recargar();
    } catch {
      setError("Error de conexión.");
    } finally {
      setGuardando(false);
    }
  };

  const onFinalizar = async (sorteoId: string) => {
    if (
      !window.confirm(
        "¿Finalizar este sorteo y elegir un ganador al azar (ponderado por chances)?"
      )
    ) {
      return;
    }
    setFinalizandoId(sorteoId);
    setError(null);
    try {
      const res = await fetch("/api/admin/sorteos/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sorteoId })
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        ganadorId?: string | null;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudo finalizar.");
        return;
      }
      await recargar();
    } catch {
      setError("Error de conexión.");
    } finally {
      setFinalizandoId(null);
    }
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={onCrear}
        className="rounded-3xl border border-bark-100 bg-white p-6 shadow-soft"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-bark-600 to-terracotta-500 text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-bark-700">
              Nuevo sorteo
            </h2>
            <p className="text-sm text-bark-500">
              Se inscriben automáticamente los clientes que cumplan el nivel.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-bark-500">
              Premio
            </span>
            <input
              required
              value={premio}
              onChange={(e) => setPremio(e.target.value)}
              maxLength={120}
              className="mt-2 w-full rounded-xl border border-bark-200 px-3 py-2.5 text-sm"
              placeholder="Ej: Kit premium para tu mascota"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-bark-500">
              Descripción
            </span>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              maxLength={2000}
              className="mt-2 w-full rounded-xl border border-bark-200 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-bark-500">
              URL de imagen
            </span>
            <input
              type="url"
              value={imagen}
              onChange={(e) => setImagen(e.target.value)}
              className="mt-2 w-full rounded-xl border border-bark-200 px-3 py-2.5 text-sm"
              placeholder="https://..."
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-bark-500">
              Fecha y hora de cierre
            </span>
            <input
              type="datetime-local"
              required
              value={fechaHoraFin}
              onChange={(e) => setFechaHoraFin(e.target.value)}
              className="mt-2 w-full rounded-xl border border-bark-200 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-bark-500">
              Nivel mínimo (huellitas históricas)
            </span>
            <select
              value={nivelMinimo}
              onChange={(e) => setNivelMinimo(e.target.value)}
              className="mt-2 w-full rounded-xl border border-bark-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="todos">Todos los clientes</option>
              {nivelesOrd.map((n) => (
                <option key={n.id} value={n.id}>
                  Solo {n.nombre} y superior ({formatNumber(n.umbralHistorico)}+ hist.)
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={guardando}
          className="btn-primary mt-5 inline-flex items-center gap-2"
        >
          {guardando ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
          Crear sorteo
        </button>
      </form>

      <section>
        <h2 className="font-display text-2xl font-semibold text-bark-700">
          Sorteos del local
        </h2>
        {sorteos.length === 0 ? (
          <p className="mt-4 text-sm text-bark-500">Todavía no hay sorteos creados.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {sorteos.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border border-bark-100 bg-cream-50/50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-bark-700">
                      {s.premio}
                    </p>
                    <p className="mt-1 text-sm text-bark-500">
                      {labelFiltroNivel(s.nivelMinimo, niveles)}
                    </p>
                    <p className="mt-2 text-xs text-bark-400">
                      {s.participantes.length} participantes · Cierra{" "}
                      {new Date(s.fechaHoraFin).toLocaleString("es-AR")}
                    </p>
                    {s.estado === "terminado" && (s.ganadorNombre || s.ganadorId) ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-terracotta-600">
                        <Trophy size={14} />
                        Ganador: {s.ganadorNombre ?? s.ganadorId}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={
                      s.estado === "activo"
                        ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-800"
                        : "rounded-full bg-bark-200 px-3 py-1 text-xs font-bold uppercase text-bark-700"
                    }
                  >
                    {s.estado}
                  </span>
                </div>
                {s.estado === "activo" ? (
                  <button
                    type="button"
                    onClick={() => s.id && onFinalizar(s.id)}
                    disabled={finalizandoId === s.id}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-bark-300 bg-white px-4 py-2 text-sm font-semibold text-bark-700 hover:bg-cream-100 disabled:opacity-60"
                  >
                    {finalizandoId === s.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trophy size={14} />
                    )}
                    Finalizar y sortear ganador
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
