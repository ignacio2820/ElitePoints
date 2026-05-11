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
import { asegurarLocalIdEnRuta, rutaConLocalId } from "@/lib/huellitas/tenant";
import { AvisoMembresiaExpiradaCliente } from "@/components/cliente/AvisoMembresiaExpiradaCliente";
import { progresoNivel } from "@/lib/huellitas/engine";
import { MascotaCard } from "@/components/MascotaCard";
import { InvitarAmigos } from "@/components/InvitarAmigos";
import { CanjesDisponibles } from "@/components/cliente/CanjesDisponibles";
import { FloatingWhatsApp } from "@/components/cliente/FloatingWhatsApp";
import { MiCuentaStickyHeader } from "@/components/cliente/MiCuentaStickyHeader";
import type { Cliente, Mascota, Premio } from "@/lib/huellitas/types";
import { cn } from "@/lib/utils";

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
  if (destino !== rutaConLocalId("/mi-cuenta", localId)) {
    redirect(destino);
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
      typeof m.fechaNacimiento === "string" ? m.fechaNacimiento : undefined,
    notas: m.notas ? String(m.notas) : undefined,
    color: m.color ? String(m.color) : undefined,
    sexo: m.sexo,
    pesoKg: typeof m.pesoKg === "number" ? m.pesoKg : undefined,
    castrado: typeof m.castrado === "boolean" ? m.castrado : undefined,
    fotoUrl: m.fotoUrl ? String(m.fotoUrl) : undefined
  }));

  // Idem para premios: solo campos primitivos requeridos por los componentes.
  const premios: Premio[] = premiosSnap.docs.map((d) => {
    const data = d.data() as Omit<Premio, "id">;
    return {
      id: d.id,
      localId: String(data.localId ?? localId),
      nombre: String(data.nombre ?? ""),
      descripcion: data.descripcion ? String(data.descripcion) : undefined,
      costoHuellitas: Number(data.costoHuellitas ?? 0),
      nivelMinimoId: String(data.nivelMinimoId ?? "cachorro"),
      categoria: data.categoria,
      stock:
        typeof data.stock === "number"
          ? data.stock
          : data.stock === null
          ? null
          : undefined,
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

  // Estética: el nivel más alto usa Premium Dark (Negro + Dorado WebElite).
  // Los demás niveles usan los gradientes cálidos por tema.
  const temaNivel = progreso.nivelActual.tema;
  const heroGradient = esTopTier
    ? "from-black via-zinc-950 to-zinc-900"
    : temaNivel === "guardian"
    ? "from-purple-900 via-fuchsia-900 to-zinc-950"
    : temaNivel === "explorador"
    ? "from-sky-900 via-indigo-900 to-zinc-950"
    : "from-bark-700 via-terracotta-600 to-zinc-900";

  return (
    <div
      className={cn(
        "min-h-screen pb-28 font-sans antialiased",
        esTopTier ? "bg-zinc-950 text-amber-50" : "bg-cream-50"
      )}
    >
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
        heroGradient={heroGradient}
        codigoCliente={cliente.codigoCliente}
      />

      <div className="mx-auto max-w-6xl space-y-5 px-4 pb-14 pt-0">
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
            tema={esTopTier ? "premium" : "warm"}
          />
        )}

        <Link
          href={rutaConLocalId("/mi-cuenta/qr", localId)}
          className={cn(
            "group block overflow-hidden rounded-3xl p-5 transition active:scale-[0.99]",
            esTopTier
              ? "border border-amber-400/40 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black shadow-[0_15px_50px_-20px_rgba(251,191,36,0.35)]"
              : "bg-white shadow-[0_15px_40px_-15px_rgba(60,40,20,0.25)]"
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl",
                  esTopTier
                    ? "bg-gradient-to-br from-amber-300 to-amber-500 text-zinc-950"
                    : "bg-gradient-to-br from-bark-600 to-bark-800 text-cream-50"
                )}
              >
                <QrCode size={26} />
              </div>
              <div>
                <p
                  className={cn(
                    "text-lg font-semibold tracking-tight",
                    esTopTier ? "text-amber-50" : "text-bark-700"
                  )}
                >
                  Mostrar mi QR
                </p>
                <p
                  className={cn(
                    "text-xs",
                    esTopTier ? "text-amber-100/70" : "text-bark-400"
                  )}
                >
                  El local lo escanea para sumar Huellitas
                </p>
              </div>
            </div>
            <ChevronRight
              className={cn(
                "transition group-hover:translate-x-1",
                esTopTier ? "text-amber-300/60" : "text-bark-400"
              )}
            />
          </div>
        </Link>

        {mascotas.length > 0 && (
          <div>
            <h2
              className={cn(
                "mb-3 px-1 text-lg font-semibold tracking-tight",
                esTopTier ? "text-amber-100" : "text-bark-700"
              )}
            >
              Mis mascotas
            </h2>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
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
      </div>

      <FloatingWhatsApp
        telefono={telefonoWhatsapp}
        nombreCliente={cliente.nombre.split(" ")[0]}
        saldoHuellitas={cliente.saldoHuellitas ?? 0}
        nombreLocal={nombreLocal}
        premium={esTopTier}
      />
    </div>
  );
}
