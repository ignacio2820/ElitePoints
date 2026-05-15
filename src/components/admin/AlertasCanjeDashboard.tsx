"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Gift, X } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface Notificacion {
  id: string;
  clienteNombre: string;
  premioNombre: string;
  costoHuellitas: number;
  stockRestante: number | null;
  codigo: string;
  creadoEn: string;
  leida: boolean;
}

interface Props {
  localId: string;
}

export function AlertasCanjeDashboard({ localId }: Props) {
  const [items, setItems] = useState<Notificacion[]>([]);
  const [cerradas, setCerradas] = useState<Set<string>>(new Set());

  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/notificaciones/canjes?noLeidas=1", {
        cache: "no-store"
      });
      const data = (await r.json()) as {
        ok: boolean;
        notificaciones?: Notificacion[];
      };
      if (data.ok && data.notificaciones) {
        setItems(data.notificaciones.filter((n) => !n.leida));
      }
    } catch {
      // silencioso en polling
    }
  }, []);

  useEffect(() => {
    void cargar();
    const id = setInterval(() => void cargar(), 8000);
    return () => clearInterval(id);
  }, [cargar, localId]);

  const visibles = items.filter((n) => !cerradas.has(n.id));
  if (visibles.length === 0) return null;

  async function descartar(ids: string[]) {
    setCerradas((prev) => new Set([...prev, ...ids]));
    try {
      await fetch("/api/admin/notificaciones/canjes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
    } catch {
      // ya ocultamos en UI
    }
  }

  return (
    <div className="mb-8 space-y-3" role="region" aria-label="Canjes recientes">
      {visibles.map((n) => (
        <div
          key={n.id}
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Bell size={18} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-950">
              Nuevo canje desde la app
            </p>
            <p className="mt-0.5 text-sm text-amber-900">
              <strong>{n.clienteNombre}</strong> canjeó{" "}
              <strong>{n.premioNombre}</strong> (
              {formatNumber(n.costoHuellitas)} Huellitas)
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-amber-800">
              <span className="inline-flex items-center gap-1">
                <Gift size={12} />
                {typeof n.stockRestante === "number"
                  ? `Stock restante: ${n.stockRestante}`
                  : "Sin control de stock"}
              </span>
              <span className="font-mono">#{n.codigo}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void descartar([n.id])}
            className="shrink-0 rounded-full p-1.5 text-amber-700 hover:bg-amber-100"
            aria-label="Descartar alerta"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
