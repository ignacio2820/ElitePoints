import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight, QrCode } from "lucide-react";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { getSesion } from "@/lib/auth/server";
import { getConfiguracion } from "@/lib/huellitas/service";
import { getInfoLocal } from "@/lib/huellitas/localService";
import { resolvePublicBaseUrl } from "@/lib/auth/continueUrl";
import { isMembresiaExpirada } from "@/lib/huellitas/membresia";
import { RUTA_PORTAL } from "@/lib/auth/redirect";
import { asegurarLocalIdEnRuta, rutaCliente } from "@/lib/huellitas/tenant";
import { AvisoMembresiaExpiradaCliente } from "@/components/cliente/AvisoMembresiaExpiradaCliente";
import { progresoNivel } from "@/lib/huellitas/engine";
import { GestionMascotasCliente } from "@/components/cliente/GestionMascotasCliente";
import { InvitarAmigos } from "@/components/InvitarAmigos";
import { FloatingWhatsApp } from "@/components/cliente/FloatingWhatsApp";
import { MiCuentaClienteShell } from "@/components/cliente/MiCuentaClienteShell";
import { MiCuentaPasskeyCard } from "@/components/cliente/MiCuentaPasskeyCard";
import type { Cliente, Mascota, Premio } from "@/lib/huellitas/types";

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

  const [clienteSnap, localSnap, cfg, premiosSnap] = await Promise.all([
    cols.cliente(db, localId, clienteId).get(),
    cols.local(db, localId).get(),
    getConfiguracion(localId),
    cols.premios(db, localId).where("activo", "==", true).get()
  ]);

  if (!clienteSnap.exists) {
    redirect("/login?intent=cliente");
  }

  const clienteRaw = clienteSnap.data() as Cliente;
  const saldoBruto = Number(clienteRaw.saldoHuellitas ?? 0);
  const reservadas = Number(clienteRaw.huellitasReservadas ?? 0);
  const cliente = {
    id: clienteSnap.id,
    nombre: String(clienteRaw.nombre ?? ""),
    saldoHuellitas: saldoBruto,
    huellitasReservadas: reservadas,
    /**
     * Lo que el cliente puede gastar AHORA. Si tiene tickets pendientes,
     * esas huellitas están reservadas y no las puede volver a canjear.
     */
    saldoDisponible: Math.max(0, saldoBruto - reservadas),
    acumuladoHistorico: Number(clienteRaw.acumuladoHistorico ?? 0),
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

  const progreso = progresoNivel(cliente.acumuladoHistorico, cfg.niveles);
  const mascotasRaw = (clienteRaw.mascotas as Mascota[] | undefined) ?? [];
  const mascotas: Mascota[] = mascotasRaw.map((m) => ({
    id: typeof m.id === "string" ? m.id : undefined,
    nombre: String(m.nombre ?? ""),
    tipo: typeof m.tipo === "string" ? m.tipo : m.especie ?? "perro",
    especie: m.especie ?? "perro",
    raza: m.raza ? String(m.raza) : undefined,
    fechaNacimiento:
      typeof m.fechaNacimiento === "string" && m.fechaNacimiento
        ? m.fechaNacimiento
        : "2000-01-01",
    fechaNacimientoBloqueada:
      m.fechaNacimientoBloqueada === true ||
      (typeof m.fechaNacimiento === "string" && m.fechaNacimiento.length > 0),
    notas: m.notas ? String(m.notas) : undefined,
    color: m.color ? String(m.color) : undefined,
    sexo: m.sexo,
    pesoKg: typeof m.pesoKg === "number" ? m.pesoKg : undefined,
    esterilizado:
      typeof m.esterilizado === "boolean" ? m.esterilizado : undefined
  }));

  // Idem para premios: solo campos primitivos requeridos por los componentes.
  const premios: Premio[] = premiosSnap.docs.map((d) => {
    const data = d.data() as Omit<Premio, "id">;
    return {
      id: d.id,
      localId: String(data.localId ?? localId),
      nombre: String(data.nombre ?? ""),
      descripcion: data.descripcion ? String(data.descripcion) : "",
      costoHuellitas: Number(data.costoHuellitas ?? 0),
      valorDescuento:
        typeof data.valorDescuento === "number" && data.valorDescuento >= 0
          ? data.valorDescuento
          : undefined,
      nivelMinimoId: String(data.nivelMinimoId ?? "cachorro"),
      categoria: data.categoria,
      stock:
        typeof data.stock === "number"
          ? data.stock
          : null,
      activo: data.activo !== false,
      especiesObjetivo: Array.isArray(data.especiesObjetivo)
        ? data.especiesObjetivo
        : []
    };
  });

  const h = headers();
  const baseUrl = resolvePublicBaseUrl(h);

  return (
    <div className="pb-28 antialiased text-bark-800">
      <MiCuentaClienteShell
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
        premios={premios}
        nivelCliente={progreso.nivelActual}
        niveles={cfg.niveles}
        especiesCliente={mascotas.map((m) => m.especie)}
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
                  El local lo escanea para sumar Huellitas
                </p>
              </div>
            </div>
            <ChevronRight className="text-bark-400 transition group-hover:translate-x-1" />
          </div>
        </Link>

        <GestionMascotasCliente mascotasIniciales={mascotas} />

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
