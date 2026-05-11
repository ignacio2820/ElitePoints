"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, QrCode } from "lucide-react";
import { HuellitasBalance } from "@/components/HuellitasBalance";
import { MascotaCard } from "@/components/MascotaCard";
import { MascotaFormPro } from "@/components/MascotaFormPro";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { NivelCard } from "@/components/NivelCard";
import { CatalogoPremios, PREMIOS_DEMO } from "@/components/CatalogoPremios";
import { InvitarAmigos } from "@/components/InvitarAmigos";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { calcularNivel } from "@/lib/huellitas/engine";
import type {
  ConfiguracionLocal,
  Mascota,
  Premio
} from "@/lib/huellitas/types";
import { formatARS } from "@/lib/utils";

export interface ClienteViewProps {
  cliente: {
    id: string;
    nombre: string;
    saldoHuellitas: number;
    acumuladoHistorico: number;
    codigoReferido?: string;
    referidosTotales?: number;
    referidosActivados?: number;
    huellitasGanadasReferidos?: number;
    mascotas: Mascota[];
  };
  cfg: ConfiguracionLocal;
  premios?: Premio[];
  nombreLocal: string;
  baseUrl: string;
}

export function ClienteView({
  cliente,
  cfg,
  premios,
  nombreLocal,
  baseUrl
}: ClienteViewProps) {
  const [mascotas, setMascotas] = useState<Mascota[]>(cliente.mascotas);
  const [mostrarForm, setMostrarForm] = useState(cliente.mascotas.length === 0);

  const nivel = calcularNivel(cliente.acumuladoHistorico, cfg.niveles);
  const especiesCliente = mascotas.map((m) => m.especie);
  const catalogo = premios ?? PREMIOS_DEMO;

  return (
    <main className="paw-bg min-h-screen">
      <header className="border-b border-bark-100 bg-cream-50/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <HuellitaIcon size={22} className="text-bark-400" />
            <span className="font-display text-lg font-semibold text-bark-700">
              Huellitas
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/cliente/${cliente.id}/qr`}
              className="btn-ghost inline-flex items-center gap-1.5 text-sm"
            >
              <QrCode size={14} /> Mi QR
            </Link>
            <Link
              href="/admin/configuracion"
              className="text-sm text-bark-500 hover:text-bark-700 inline-flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Vista del local
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        {/* Hero: saldo + nivel/progreso */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <HuellitasBalance
              saldo={cliente.saldoHuellitas}
              valorMonetarioHuellita={cfg.valorMonetarioHuellita}
              nombreCliente={cliente.nombre}
            />
          </div>
          <div className="lg:col-span-5">
            <NivelCard
              acumuladoHistorico={cliente.acumuladoHistorico}
              niveles={cfg.niveles}
            />
          </div>
        </div>

        {/* Cómo funciona — versión compacta porque ya hay otra info arriba */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Cómo funciona</CardTitle>
            <CardDescription>
              Una experiencia simple, sin letra chica.
            </CardDescription>
          </CardHeader>
          <ul className="grid gap-4 sm:grid-cols-3 text-sm text-bark-500">
            <li className="rounded-2xl bg-cream-50 p-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white font-semibold text-bark-700">
                1
              </div>
              <p className="mt-3">
                Cada{" "}
                <strong className="text-bark-700">
                  {formatARS(cfg.montoParaUnaHuellita)}
                </strong>{" "}
                gastados sumás 1 huellita. Tu nivel actual ({nivel.nombre}){" "}
                multiplica por <strong>{nivel.multiplicador}×</strong>.
              </p>
            </li>
            <li className="rounded-2xl bg-cream-50 p-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white font-semibold text-bark-700">
                2
              </div>
              <p className="mt-3">
                Canjealas por premios del catálogo. Cada huellita vale{" "}
                <strong className="text-bark-700">
                  {formatARS(cfg.valorMonetarioHuellita)}
                </strong>{" "}
                de descuento.
              </p>
            </li>
            <li className="rounded-2xl bg-cream-50 p-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white font-semibold text-bark-700">
                3
              </div>
              <p className="mt-3">
                Tus huellitas duran{" "}
                <strong className="text-bark-700">{cfg.diasVencimiento} días</strong>.
                El acumulado histórico (que define tu rango) nunca decrece.
              </p>
            </li>
          </ul>
        </Card>

        {/* Catálogo de premios filtrable */}
        <CatalogoPremios
          premios={catalogo}
          saldoCliente={cliente.saldoHuellitas}
          nivelCliente={nivel}
          niveles={cfg.niveles}
          especiesCliente={especiesCliente}
          onCanjear={() => {
            // En producción: POST /api/canje-premio
            alert("¡Premio canjeado! (demo)");
          }}
        />

        {/* Boca en boca: invitar amigos */}
        {cfg.referidos.activo && cliente.codigoReferido ? (
          <InvitarAmigos
            codigo={cliente.codigoReferido}
            nombreLocal={nombreLocal}
            baseUrl={baseUrl}
            mensajePlantilla={cfg.referidos.mensajeWhatsApp}
            bonusBienvenida={cfg.referidos.bonusBienvenida}
            bonusReferente={cfg.referidos.bonusReferente}
            stats={{
              referidosTotales: cliente.referidosTotales ?? 0,
              referidosActivados: cliente.referidosActivados ?? 0,
              huellitasGanadas: cliente.huellitasGanadasReferidos ?? 0
            }}
          />
        ) : null}

        {/* Mascotas + ficha sofisticada */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Tu manada</CardTitle>
                <CardDescription>
                  Vamos a saludar a cada una en su cumpleaños. Completá su ficha
                  para que el local te recomiende mejor.
                </CardDescription>
              </CardHeader>
              {mascotas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-bark-200 p-6 text-center text-sm text-[color:var(--muted)]">
                  Todavía no agregaste mascotas.
                </div>
              ) : (
                <div className="space-y-3">
                  {mascotas.map((m, i) => (
                    <MascotaCard key={m.id ?? `m-${i}`} mascota={m} />
                  ))}
                </div>
              )}
              {!mostrarForm ? (
                <button
                  onClick={() => setMostrarForm(true)}
                  className="mt-4 w-full btn-ghost"
                >
                  + Sumar otra mascota
                </button>
              ) : null}
            </Card>
          </div>
          <div className="lg:col-span-7">
            {mostrarForm ? (
              <MascotaFormPro
                onSubmit={async (m) => {
                  setMascotas((prev) => [...prev, m]);
                  setMostrarForm(false);
                  // En producción: POST /api/clientes/{id}/mascotas
                }}
                submitLabel="Sumar a mi manada"
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Tus mascotas están al día</CardTitle>
                  <CardDescription>
                    Agregá otra cuando quieras. La ficha completa nos ayuda a
                    recomendarte mejor.
                  </CardDescription>
                </CardHeader>
                <button
                  onClick={() => setMostrarForm(true)}
                  className="btn-primary"
                >
                  + Sumar otra mascota
                </button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
