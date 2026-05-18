"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Gift, Loader2, Sparkles, Trash2, Trophy } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { resolverUrlImagenSorteo } from "@/lib/admin/sorteoImagenUpload";
import type { NivelLealtad } from "@/lib/huellitas/types";
import type { Sorteo } from "@/lib/huellitas/sorteosTypes";
import { labelFiltroNivel } from "@/lib/huellitas/sorteosUtils";
import { niveleseOrdenados } from "@/lib/huellitas/engine";
import { ahoraDatetimeLocal, DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { formatNumber } from "@/lib/utils";

type Props = {
  niveles: NivelLealtad[];
  sorteosIniciales: Sorteo[];
};

export function SorteosAdminPanel({ niveles, sorteosIniciales }: Props) {
  const { sesion } = useAuth();
  const [sorteos, setSorteos] = useState<Sorteo[]>(sorteosIniciales);
  const [premio, setPremio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [fechaHoraFin, setFechaHoraFin] = useState("");
  const [nivelMinimo, setNivelMinimo] = useState("todos");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const previewBlobRef = useRef<string | null>(null);

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
      const localId = sesion?.claims.localId;
      if (!localId) {
        setError("No hay sesión de administrador activa.");
        return;
      }

      const res = await fetch("/api/admin/sorteos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          premio,
          descripcion,
          fechaHoraFin: new Date(fechaHoraFin).toISOString(),
          nivelMinimo
        })
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        sorteo?: Sorteo;
      };
      if (!res.ok || !data.ok || !data.sorteo?.id) {
        setError(data.error ?? "No se pudo crear el sorteo.");
        return;
      }

      if (imagenFile) {
        try {
          await resolverUrlImagenSorteo({
            localId,
            sorteoId: data.sorteo.id,
            imagenFile
          });
        } catch (imgErr) {
          setError(
            imgErr instanceof Error
              ? `Sorteo creado, pero la imagen falló: ${imgErr.message}`
              : "Sorteo creado, pero no se pudo subir la imagen."
          );
          await recargar();
          return;
        }
      }

      setPremio("");
      setDescripcion("");
      setImagenFile(null);
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
        previewBlobRef.current = null;
      }
      setImagenPreview(null);
      setFechaHoraFin("");
      setNivelMinimo("todos");
      await recargar();
    } catch {
      setError("Error de conexión.");
    } finally {
      setGuardando(false);
    }
  };

  const onEliminar = async (sorteo: Sorteo) => {
    if (!sorteo.id) return;
    if (
      !window.confirm(
        `¿Eliminar el sorteo "${sorteo.premio}"? Se borrará el registro y su imagen. Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setEliminandoId(sorteo.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/sorteos/${encodeURIComponent(sorteo.id)}`,
        { method: "DELETE", credentials: "same-origin" }
      );
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudo eliminar el sorteo.");
        return;
      }
      await recargar();
    } catch {
      setError("Error de conexión al eliminar.");
    } finally {
      setEliminandoId(null);
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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-800 to-[#fb8500] text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-emerald-900">
              Nuevo sorteo
            </h2>
            <p className="text-sm text-bark-500">
              Se inscriben automáticamente los clientes que cumplan el nivel.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="label-elegant">Premio</span>
            <input
              required
              value={premio}
              onChange={(e) => setPremio(e.target.value)}
              maxLength={120}
              className="input-elegant mt-2"
              placeholder="Ej: Kit premium para tu mascota"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="label-elegant">Descripción</span>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              maxLength={2000}
              className="input-elegant mt-2 min-h-[88px] resize-y"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="label-elegant">Imagen del premio</span>
            <span className="mt-1 block text-xs text-bark-500">
              JPG o PNG. Se comprime a 800px y se sube automáticamente.
            </span>
            <label className="group relative mt-2 flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 px-4 py-5 text-center transition-colors hover:border-[#fb8500] hover:bg-orange-50/40">
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="sr-only"
                disabled={guardando}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file && !["image/jpeg", "image/png"].includes(file.type)) {
                    setError("Solo se permiten archivos JPG o PNG.");
                    e.target.value = "";
                    return;
                  }
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
                    setImagenPreview(null);
                  }
                  e.target.value = "";
                }}
              />
              {imagenPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagenPreview}
                  alt="Vista previa del premio del sorteo"
                  className="max-h-36 w-full max-w-[200px] rounded-xl border border-bark-100 object-contain shadow-sm"
                />
              ) : (
                <>
                  <Camera
                    className="h-9 w-9 text-emerald-600 transition-colors group-hover:text-[#fb8500]"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span className="text-sm font-semibold text-emerald-900">
                    Elegir imagen del premio
                  </span>
                </>
              )}
              {imagenPreview ? (
                <span className="text-xs text-bark-500 group-hover:text-[#fb8500]">
                  Tocá para cambiar la foto
                </span>
              ) : null}
            </label>
          </label>
          <DateTimePickerField
            label="Fecha y hora de cierre"
            required
            value={fechaHoraFin}
            onChange={setFechaHoraFin}
            min={ahoraDatetimeLocal()}
          />
          <label className="block sm:col-span-2">
            <span className="label-elegant">Nivel mínimo (huellitas históricas)</span>
            <select
              value={nivelMinimo}
              onChange={(e) => setNivelMinimo(e.target.value)}
              className="input-elegant mt-2"
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
                  <div className="flex min-w-0 gap-4">
                    {s.imagen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.imagen}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-xl border border-bark-100 object-cover"
                      />
                    ) : null}
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
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        s.estado === "activo"
                          ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-800"
                          : "rounded-full bg-bark-200 px-3 py-1 text-xs font-bold uppercase text-bark-700"
                      }
                    >
                      {s.estado}
                    </span>
                    {s.estado === "terminado" ? (
                      <button
                        type="button"
                        onClick={() => void onEliminar(s)}
                        disabled={eliminandoId === s.id}
                        title="Eliminar sorteo archivado"
                        aria-label="Eliminar sorteo"
                        className="rounded-lg p-2 text-bark-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        {eliminandoId === s.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    ) : null}
                  </div>
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

