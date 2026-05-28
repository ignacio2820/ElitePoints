import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight, Gift, QrCode, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { getSesion } from "@/lib/auth/server";
import { getConfiguracion } from "@/lib/huellitas/service";
import { datosContactoDesdeInfoLocal } from "@/lib/huellitas/datosContactoLocal";
import { getInfoLocal } from "@/lib/huellitas/localService";
import { resolvePublicBaseUrl } from "@/lib/auth/continueUrl";
import { isMembresiaExpirada } from "@/lib/huellitas/membresia";
import { RUTA_PORTAL } from "@/lib/auth/redirect";
import { asegurarLocalIdEnRuta, rutaCliente } from "@/lib/huellitas/tenant";
import { AvisoMembresiaExpiradaCliente } from "@/components/cliente/AvisoMembresiaExpiradaCliente";
import {
  leerHuellitasActuales,
  leerHuellitasHistoricas,
  progresoNivelCliente
} from "@/lib/huellitas/saldosCliente";
import { InvitarAmigos } from "@/components/InvitarAmigos";
import { FloatingWhatsApp } from "@/components/cliente/FloatingWhatsApp";
import { BannerSorteoActivoCliente } from "@/components/cliente/BannerSorteoActivoCliente";
import { MiCuentaClienteShell } from "@/components/cliente/MiCuentaClienteShell";
import { clienteTieneSorteoActivoElegible } from "@/lib/huellitas/sorteosService";
import { MiCuentaPasskeyCard } from "@/components/cliente/MiCuentaPasskeyCard";
import type { Cliente } from "@/lib/huellitas/types";

export const dynamic = "force-dynamic";

interface DocLocal {
  nombre?: string;
  logoUrl?: string;
  telefonoWhatsapp?: string;
}

export default async function MiCuentaPage({
  searchParams
}: {
  searchParams?: { localId?: string };
}) {
  const sesion = await getSesion();
  if (!sesion?.claims.clienteId) redirect("/login?intent=cliente");

  const { localId, clienteId } = sesion.claims;
  const destino = asegurarLocalIdEnRuta(
    RUTA_PORTAL,
    localId,
    searchParams?.localId
  );
  if (destino !== rutaCliente(RUTA_PORTAL)) {
    redirect(destino);
  }
  if (searchParams?.localId) {
    redirect(RUTA_PORTAL);
  }
  const db = adminDb();

  const [clienteSnap, localSnap, cfg, haySorteoActivo] = await Promise.all([
    cols.cliente(db, localId, clienteId).get(),
    cols.local(db, localId).get(),
    getConfiguracion(localId),
    clienteTieneSorteoActivoElegible(localId, clienteId)
  ]);

  if (!clienteSnap.exists) {
    redirect("/login?intent=cliente");
  }

  const clienteRaw = clienteSnap.data() as Cliente;
  const saldoBruto = leerHuellitasActuales(clienteRaw);
  const reservadas = Number(clienteRaw.huellitasReservadas ?? 0);
  const cliente = {
    id: clienteSnap.id,
    nombre: String(clienteRaw.nombre ?? ""),
    saldoHuellitas: saldoBruto,
    huellitasReservadas: reservadas,
    /**
     * Lo que el cliente puede gastar AHORA. Si tiene tickets pendientes,
     * esas puntos están reservadas y no las puede volver a canjear.
     */
    saldoDisponible: Math.max(0, saldoBruto - reservadas),
    acumuladoHistorico: leerHuellitasHistoricas(clienteRaw),
    huellitasHistoricas: leerHuellitasHistoricas(clienteRaw),
    codigoCliente: clienteRaw.codigoCliente,
    codigoReferido: clienteRaw.codigoReferido,
    referidosTotales: Number(clienteRaw.referidosTotales ?? 0),
    referidosActivados: Number(clienteRaw.referidosActivados ?? 0)
  };
  const dataLocal = (localSnap.data() ?? {}) as DocLocal;
  const infoLocal = await getInfoLocal(localId);
  const membresiaExpirada = isMembresiaExpirada(infoLocal);
  const nombreLocal = dataLocal.nombre ?? localId;
  const logoUrl = dataLocal.logoUrl ?? null;
  const telefonoWhatsapp = dataLocal.telefonoWhatsapp ?? null;

  const progreso = progresoNivelCliente(clienteRaw, cfg.niveles);

  const h = headers();
  const baseUrl = resolvePublicBaseUrl(h);

  return (
    <div className="pb-28 antialiased text-bark-800">
      <MiCuentaClienteShell
        bannerInicio={
          haySorteoActivo && !membresiaExpirada ? (
            <BannerSorteoActivoCliente />
          ) : null
        }
        nombreLocal={nombreLocal}
        logoUrl={logoUrl}
        nombreCliente={cliente.nombre}
        saldoDisponibleInicial={cliente.saldoDisponible}
        huellitasReservadas={cliente.huellitasReservadas}
        valorMonetarioHuellita={cfg.valorMonetarioHuellita}
        nivelActual={progreso.nivelActual}
        pctTramo={progreso.pctTramo}
        nivelSiguienteNombre={
          progreso.nivelSiguiente ? progreso.nivelSiguiente.nombre : null
        }
        huellitasFaltantes={progreso.huellitasFaltantes}
        esLeyenda={!progreso.nivelSiguiente}
        montoParaUnaHuellita={cfg.montoParaUnaHuellita}
        diasVencimiento={cfg.diasVencimiento}
        datosContacto={datosContactoDesdeInfoLocal(
          {
            ...infoLocal,
            telefonoWhatsapp:
              infoLocal.telefonoWhatsapp ?? telefonoWhatsapp ?? undefined
          },
          nombreLocal
        )}
      >
        {membresiaExpirada ? (
          <AvisoMembresiaExpiradaCliente nombreLocal={nombreLocal} />
        ) : null}

        <MiCuentaPasskeyCard />

        <Link
          href="/portal/qr"
          className="surface-card group block overflow-hidden rounded-2xl p-5 transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-bark-500 to-terracotta-500 text-cream-50 shadow-soft">
                <QrCode size={26} />
              </div>
              <div>
                <p className="font-display text-lg font-semibold tracking-tight text-bark-700">
                  Mostrar mi QR
                </p>
                <p className="text-sm text-bark-500">
                  El local lo escanea para sumar Puntos
                </p>
              </div>
            </div>
            <ChevronRight className="text-bark-400 transition group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          href="/mi-cuenta/catalogo"
          className="surface-card group block overflow-hidden rounded-2xl p-5 transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-cream-50 shadow-soft">
                <Gift size={26} />
              </div>
              <div>
                <p className="font-display text-lg font-semibold tracking-tight text-bark-700">
                  Catálogo de recompensas
                </p>
                <p className="text-sm text-bark-500">
                  Canjeá tus Puntos por premios del comercio
                </p>
              </div>
            </div>
            <ChevronRight className="text-bark-400 transition group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          href="/mi-cuenta/sorteos"
          className="surface-card group block overflow-hidden rounded-2xl p-5 transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-bark-600 to-terracotta-500 text-cream-50 shadow-soft">
                <Sparkles size={26} />
              </div>
              <div>
                <p className="font-display text-lg font-semibold tracking-tight text-bark-700">
                  Sorteos activos
                </p>
                <p className="text-sm text-bark-500">
                  Potenciá tus chances con puntos
                </p>
              </div>
            </div>
            <ChevronRight className="text-bark-400 transition group-hover:translate-x-1" />
          </div>
        </Link>

        {cliente.codigoReferido && cfg.referidos.activo && (
          <InvitarAmigos
            localId={localId}
            codigo={cliente.codigoReferido}
            nombreLocal={nombreLocal}
            mensajePlantilla={cfg.referidos.mensajeWhatsApp}
            bonusBienvenida={cfg.referidos.bonusBienvenida}
            bonusReferente={cfg.referidos.bonusReferente}
            stats={{
              referidosTotales: cliente.referidosTotales ?? 0,
              referidosActivados: cliente.referidosActivados ?? 0,
              huellitasGanadas:
                (cliente.referidosActivados ?? 0) * cfg.referidos.bonusReferente
            }}
            baseUrl={baseUrl}
          />
        )}
      </MiCuentaClienteShell>

      <FloatingWhatsApp
        telefono={telefonoWhatsapp}
        nombreCliente={cliente.nombre.split(" ")[0]}
        saldoHuellitas={cliente.saldoHuellitas ?? 0}
        nombreLocal={nombreLocal}
        premium={false}
      />
    </div>
  );
}
