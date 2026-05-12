import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight, QrCode } from "lucide-react";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { getSesion } from "@/lib/auth/server";
import { getConfiguracion } from "@/lib/huellitas/service";
import { getInfoLocal } from "@/lib/huellitas/localService";
import { isMembresiaExpirada } from "@/lib/huellitas/membresia";
import { asegurarLocalIdEnRuta, rutaCliente } from "@/lib/huellitas/tenant";
import { AvisoMembresiaExpiradaCliente } from "@/components/cliente/AvisoMembresiaExpiradaCliente";
import { progresoNivel } from "@/lib/huellitas/engine";
import { MascotaCard } from "@/components/MascotaCard";
import { InvitarAmigos } from "@/components/InvitarAmigos";
import { CanjesDisponibles } from "@/components/cliente/CanjesDisponibles";
import { FloatingWhatsApp } from "@/components/cliente/FloatingWhatsApp";
import { MiCuentaStickyHeader } from "@/components/cliente/MiCuentaStickyHeader";
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
    "/mi-cuenta",
    localId,
    searchParams?.localId
  );
  if (destino !== rutaCliente("/mi-cuenta")) {
    redirect(destino);
  }
  if (searchParams?.localId) {
    redirect("/mi-cuenta");
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
  const cliente = {
    id: clienteSnap.id,
    nombre: String(clienteRaw.nombre ?? ""),
    saldoHuellitas: Number(clienteRaw.saldoHuellitas ?? 0),
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
  // Serializamos mascotas a objetos planos (sin Timestamps de Firestore).
  const mascotasRaw = (clienteRaw.mascotas as Mascota[] | undefined) ?? [];
  const mascotas: Mascota[] = mascotasRaw.map((m) => ({
    nombre: String(m.nombre ?? ""),
    especie: m.especie,
    raza: m.raza ? String(m.raza) : undefined,
    fechaNacimiento:
      typeof m.fechaNacimiento === "string" && m.fechaNacimiento
        ? m.fechaNacimiento
        : "2000-01-01",
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
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  // ¿Es el nivel más alto del programa? (último en la lista de niveles)
  const idxActual = cfg.niveles.findIndex(
    (n) => n.id === progreso.nivelActual.id
  );
  const esTopTier =
    idxActual >= 0 && idxActual === cfg.niveles.length - 1;

  const temaNivel = progreso.nivelActual.tema;

  return (
    <div className="pb-28 antialiased text-bark-800">
      <MiCuentaStickyHeader
        nombreLocal={nombreLocal}
        logoUrl={logoUrl}
        primerNombre={cliente.nombre.split(" ")[0]}
        saldoHuellitas={cliente.saldoHuellitas}
        valorMonetarioHuellita={cfg.valorMonetarioHuellita}
        nivelActual={progreso.nivelActual}
        temaNivel={temaNivel}
        pctTramo={progreso.pctTramo}
        nivelSiguienteNombre={
          progreso.nivelSiguiente ? progreso.nivelSiguiente.nombre : null
        }
        huellitasFaltantes={progreso.huellitasFaltantes}
        esLeyenda={!progreso.nivelSiguiente}
        esTopTier={esTopTier}
        codigoCliente={cliente.codigoCliente}
      />

      <main className="mx-auto max-w-6xl space-y-5 px-6 py-10 pb-14">
        {membresiaExpirada ? (
          <AvisoMembresiaExpiradaCliente nombreLocal={nombreLocal} />
        ) : null}
        {premios.length > 0 && (
          <CanjesDisponibles
            premios={premios}
            saldoCliente={cliente.saldoHuellitas ?? 0}
            nivelCliente={progreso.nivelActual}
            niveles={cfg.niveles}
            especiesCliente={mascotas.map((m) => m.especie)}
          />
        )}

        <Link
          href="/mi-cuenta/qr"
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

        {mascotas.length > 0 && (
          <div>
            <h2 className="mb-3 px-1 font-display text-lg font-semibold tracking-tight text-bark-700">
              Mis mascotas
            </h2>
            <div className="-mx-6 flex snap-x gap-3 overflow-x-auto px-6 pb-2">
              {mascotas.map((m, i) => (
                <div key={i} className="w-[260px] shrink-0 snap-start">
                  <MascotaCard mascota={m} />
                </div>
              ))}
            </div>
          </div>
        )}

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
      </main>

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
