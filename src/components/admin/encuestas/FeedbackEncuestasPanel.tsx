"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  Loader2,
  MessageSquare,
  Package,
  RefreshCw,
  Trash2,
  Users
} from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import type {
  EncuestaFeedbackAdmin,
  ResumenFeedbackEncuestas
} from "@/lib/huellitas/encuestasAdminService";
import { cn } from "@/lib/utils";

type Filtro =
  | "todas"
  | "comentarios"
  | "atencion"
  | "espera"
  | "productos";

function formatearFecha(iso: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function canalLabel(canal?: string): string {
  if (canal === "in_app") return "App";
  if (canal === "web") return "Enlace web";
  if (canal === "email") return "Email";
  return "Clásica";
}

type FeedbackEncuestasPanelProps = {
  descripcion?: string;
};

export function FeedbackEncuestasPanel({
  descripcion
}: FeedbackEncuestasPanelProps = {}) {
  const [items, setItems] = useState<EncuestaFeedbackAdmin[]>([]);
  const [resumen, setResumen] = useState<ResumenFeedbackEncuestas | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/encuestas/feedback", {
        credentials: "same-origin",
        cache: "no-store"
      });
      const data = (await res.json()) as {
        ok: boolean;
        items?: EncuestaFeedbackAdmin[];
        resumen?: ResumenFeedbackEncuestas;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudieron cargar las opiniones.");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
      setResumen(data.resumen ?? null);
    } catch {
      setError("Error de conexión.");
      setItems([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filtradas = useMemo(() => {
    switch (filtro) {
      case "comentarios":
        return items.filter((i) => i.comentario?.trim());
      case "atencion":
        return items.filter(
          (i) =>
            i.respuestas?.atencion === "regular" ||
            i.respuestas?.atencion === "mala"
        );
      case "espera":
        return items.filter((i) => i.respuestas?.tiempoEspera === "largo");
      case "productos":
        return items.filter((i) => i.respuestas?.productos === "faltaron");
      default:
        return items;
    }
  }, [items, filtro]);

  async function eliminar(encuestaId: string) {
    if (
      !window.confirm(
        "¿Eliminar esta opinión? No se puede deshacer. Sirve para limpiar el listado."
      )
    ) {
      return;
    }
    setEliminandoId(encuestaId);
    try {
      const res = await fetch(
        `/api/admin/encuestas/${encodeURIComponent(encuestaId)}`,
        { method: "DELETE", credentials: "same-origin" }
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo eliminar.");
      }
      setItems((prev) => prev.filter((i) => i.encuestaId !== encuestaId));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error al eliminar.");
    } finally {
      setEliminandoId(null);
    }
  }

  const filtros: { id: Filtro; label: string; count?: number }[] = [
    { id: "todas", label: "Todas", count: resumen?.total },
    { id: "atencion", label: "Atención a mejorar", count: resumen?.atencionRegularOMala },
    { id: "espera", label: "Espera larga", count: resumen?.esperaLarga },
    { id: "productos", label: "Faltó stock", count: resumen?.productosFaltantes },
    { id: "comentarios", label: "Con comentario", count: resumen?.conComentario }
  ];

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-bark-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando opiniones…
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <p className="text-sm leading-relaxed text-bark-600">
        {descripcion ??
          "Acá ves todas las encuestas post-compra: cómo califican la atención, si esperaron mucho, si encontraron lo que buscaban y qué comentan. Podés eliminar filas viejas para mantener el panel ordenado."}
      </p>

      {resumen ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TarjetaResumen
            icono={<Users size={18} />}
            titulo="Total cargadas"
            valor={resumen.total}
          />
          <TarjetaResumen
            icono={<HuellitaIcon size={18} />}
            titulo="Atención regular/mala"
            valor={resumen.atencionRegularOMala}
            destacado={resumen.atencionRegularOMala > 0}
          />
          <TarjetaResumen
            icono={<Clock size={18} />}
            titulo="Espera larga"
            valor={resumen.esperaLarga}
            destacado={resumen.esperaLarga > 0}
          />
          <TarjetaResumen
            icono={<Package size={18} />}
            titulo="Faltaron productos"
            valor={resumen.productosFaltantes}
            destacado={resumen.productosFaltantes > 0}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filtros.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition ring-1",
                filtro === f.id
                  ? "bg-emerald-800 text-white ring-emerald-800"
                  : "bg-white text-bark-600 ring-bark-200 hover:bg-cream-50"
              )}
            >
              {f.label}
              {f.count !== undefined ? ` (${f.count})` : ""}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void cargar()}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50"
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {filtradas.length === 0 && !error ? (
        <div className="surface-card rounded-2xl p-10 text-center text-bark-600">
          {items.length === 0
            ? "Todavía no hay encuestas completadas. Aparecerán cuando los clientes respondan después de una compra con huellitas."
            : "Ninguna opinión coincide con este filtro."}
        </div>
      ) : (
        <div className="surface-card overflow-hidden rounded-2xl ring-1 ring-bark-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-bark-100 bg-cream-50/80 text-xs font-semibold uppercase tracking-wide text-bark-500">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Atención</th>
                  <th className="px-4 py-3">Espera</th>
                  <th className="px-4 py-3">Productos</th>
                  <th className="px-4 py-3">Comentario</th>
                  <th className="px-4 py-3">Canal</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((e) => (
                  <tr
                    key={e.encuestaId}
                    className={cn(
                      "border-b border-bark-50 last:border-0",
                      e.requiereAtencion && e.estadoAtencion !== "resuelta"
                        ? "bg-red-50/40"
                        : "hover:bg-cream-50/50"
                    )}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-bark-500">
                      {formatearFecha(e.creadoEn)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-bark-800">
                      {e.nombreCliente}
                      <span className="mt-0.5 flex items-center gap-0.5 text-xs font-normal text-bark-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <HuellitaIcon
                            key={i}
                            size={14}
                            filled={i < e.puntuacion}
                            className={
                              i < e.puntuacion
                                ? "text-terracotta-500"
                                : "text-bark-200"
                            }
                          />
                        ))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <CeldaEtiqueta valor={e.etiquetas.atencion} alerta={
                        e.respuestas?.atencion === "mala" ||
                        e.respuestas?.atencion === "regular"
                      } />
                    </td>
                    <td className="px-4 py-3">
                      <CeldaEtiqueta
                        valor={e.etiquetas.tiempoEspera}
                        alerta={e.respuestas?.tiempoEspera === "largo"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <CeldaEtiqueta
                        valor={e.etiquetas.productos}
                        alerta={e.respuestas?.productos === "faltaron"}
                      />
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-bark-600">
                      {e.comentario ? (
                        <span className="line-clamp-3" title={e.comentario}>
                          {e.comentario}
                        </span>
                      ) : (
                        <span className="italic text-bark-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-bark-500">
                      {canalLabel(e.canal)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={eliminandoId === e.encuestaId}
                        onClick={() => void eliminar(e.encuestaId)}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
                        title="Eliminar del listado"
                      >
                        {eliminandoId === e.encuestaId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-bark-500">
        <MessageSquare size={14} className="mt-0.5 shrink-0" />
        Las filas en rojo suave son casos que requieren atención (también en la
        pestaña Alertas, con opción de enviar disculpa con huellitas).
      </p>
    </section>
  );
}

function TarjetaResumen({
  icono,
  titulo,
  valor,
  destacado
}: {
  icono: React.ReactNode;
  titulo: string;
  valor: number;
  destacado?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        destacado
          ? "border-amber-200 bg-amber-50/80"
          : "border-bark-100 bg-white"
      )}
    >
      <div className="flex items-center gap-2 text-bark-500">{icono}</div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-bark-500">
        {titulo}
      </p>
      <p className="font-display text-2xl font-bold text-bark-800">{valor}</p>
    </div>
  );
}

function CeldaEtiqueta({
  valor,
  alerta
}: {
  valor: string;
  alerta?: boolean;
}) {
  if (valor === "—") {
    return <span className="text-bark-400">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
        alerta
          ? "bg-amber-100 text-amber-900"
          : "bg-emerald-50 text-emerald-900"
      )}
    >
      {valor}
    </span>
  );
}
