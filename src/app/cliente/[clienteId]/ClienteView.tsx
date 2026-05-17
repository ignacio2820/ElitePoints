"use client";

import Link from "next/link";
import { QrCode } from "lucide-react";
import { HuellitasBalance } from "@/components/HuellitasBalance";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { CanjesDisponibles } from "@/components/cliente/CanjesDisponibles";
import { AvisoMembresiaExpiradaCliente } from "@/components/cliente/AvisoMembresiaExpiradaCliente";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type { ConfiguracionLocal, NivelLealtad, Premio } from "@/lib/huellitas/types";
import { formatNumber } from "@/lib/utils";

export type HistorialPuntoCliente = {
  id: string;
  fecha: string;
  huellitasGeneradas: number;
};

export interface ClienteViewProps {
  localId: string;
  cliente: {
    id: string;
    nombre: string;
    saldoHuellitas: number;
    huellitasReservadas?: number;
    acumuladoHistorico: number;
  };
  cfg: ConfiguracionLocal;
  premios: Premio[];
  historialPuntos: HistorialPuntoCliente[];
  saldoDisponible: number;
  huellitasReservadas: number;
  nombreLocal: string;
  baseUrl: string;
  membresiaExpirada?: boolean;
  /** Vista demo pública: catálogo sin generar cupones reales. */
  modoDemo?: boolean;
  nivelCliente: NivelLealtad;
}

function formatearFechaCorta(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function ClienteView({
  localId,
  cliente,
  cfg,
  premios,
  historialPuntos,
  saldoDisponible,
  huellitasReservadas,
  nombreLocal,
  baseUrl,
  membresiaExpirada = false,
  modoDemo = false,
  nivelCliente
}: ClienteViewProps) {
  const qrHref = `/cliente/${cliente.id}/qr?localId=${encodeURIComponent(localId)}`;

  return (
    <main className="paw-bg min-h-screen">
      <header className="sticky top-0 z-10 border-b border-bark-100 bg-cream-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bark-400">
              {nombreLocal}
            </p>
            <p className="mt-0.5 font-display text-lg font-semibold text-bark-700">
              Hola, {cliente.nombre.split(" ")[0]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={qrHref}
              className="btn-ghost inline-flex items-center gap-1.5 text-sm"
            >
              <QrCode size={14} /> Mi QR
            </Link>
            {!modoDemo ? (
              <Link href="/mi-cuenta" className="btn-primary text-sm">
                Mi cuenta
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        {membresiaExpirada ? (
          <AvisoMembresiaExpiradaCliente nombreLocal={nombreLocal} />
        ) : null}

        <HuellitasBalance
          saldo={saldoDisponible}
          valorMonetarioHuellita={cfg.valorMonetarioHuellita}
          nombreCliente={cliente.nombre}
        />
        {huellitasReservadas > 0 ? (
          <p className="-mt-4 text-center text-sm text-bark-500">
            Tenés{" "}
            <strong className="text-bark-700">
              {formatNumber(huellitasReservadas)} huellitas
            </strong>{" "}
            reservadas en cupones pendientes de entrega en el local.
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Últimas huellitas sumadas</CardTitle>
            <CardDescription>
              Compras registradas en {nombreLocal} donde ganaste huellitas.
            </CardDescription>
          </CardHeader>
          {historialPuntos.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-bark-500">
              Todavía no hay movimientos. Pasá por caja con tu QR para sumar en
              tu próxima compra.
            </p>
          ) : (
            <ul className="divide-y divide-bark-100 px-2 pb-4">
              {historialPuntos.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="text-sm text-bark-500">
                    {formatearFechaCorta(row.fecha)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-bark-800">
                    <HuellitaIcon size={16} className="text-terracotta-500" />+
                    {formatNumber(row.huellitasGeneradas)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {modoDemo ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
            Vista de demostración: el canje real está en{" "}
            <Link href="/login" className="font-semibold underline">
              Mi cuenta
            </Link>{" "}
            después de registrarte en el Pet Shop.
          </p>
        ) : null}

        <CanjesDisponibles
          premios={premios}
          saldoCliente={saldoDisponible}
          valorMonetarioHuellita={cfg.valorMonetarioHuellita}
          nivelCliente={nivelCliente}
          niveles={cfg.niveles}
          puedeCanjear={!modoDemo}
        />
      </div>
    </main>
  );
}
