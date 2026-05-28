import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ClienteView, type HistorialPuntoCliente } from "./ClienteView";
import { resolvePublicBaseUrl } from "@/lib/auth/continueUrl";
import { requiereAccesoClientePublico } from "@/lib/auth/clientePortal";
import { getInfoLocal } from "@/lib/huellitas/localService";
import { isMembresiaExpirada } from "@/lib/huellitas/membresia";
import {
  CONFIGURACION_DEFAULT,
  type ConfiguracionLocal,
  type Premio
} from "@/lib/huellitas/types";
import { PREMIOS_DEMO } from "@/components/CatalogoPremios";
import { calcularNivelCliente } from "@/lib/huellitas/saldosCliente";

const NOMBRE_LOCAL_DEMO = "Comercio Demo ElitePoints";

const CLIENTE_DEMO = {
  id: "demo",
  nombre: "Lucía Romero",
  saldoHuellitas: 142,
  huellitasReservadas: 0,
  acumuladoHistorico: 1340,
  codigoReferido: "LUC-K3MP",
  referidosTotales: 4,
  referidosActivados: 2,
  huellitasGanadasReferidos: 60
};

function fechaVentaIso(val: unknown): string {
  if (
    val != null &&
    typeof val === "object" &&
    "toDate" in val &&
    typeof (val as { toDate: unknown }).toDate === "function"
  ) {
    const d = (val as { toDate: () => Date }).toDate();
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  if (typeof val === "string" && val) return val;
  return "";
}

async function historialVentasCliente(
  localId: string,
  clienteId: string
): Promise<HistorialPuntoCliente[]> {
  const { adminDb } = await import("@/lib/firebase/admin");
  const { cols } = await import("@/lib/firebase/collections");
  const db = adminDb();
  try {
    const snap = await cols
      .ventas(db, localId)
      .where("clienteId", "==", clienteId)
      .orderBy("fecha", "desc")
      .limit(20)
      .get();
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        fecha: fechaVentaIso(data.fecha),
        huellitasGeneradas: Math.max(0, Number(data.huellitasGeneradas ?? 0))
      };
    });
  } catch {
    return [];
  }
}

async function premiosActivosCliente(
  localId: string
): Promise<Premio[]> {
  const { adminDb } = await import("@/lib/firebase/admin");
  const { cols } = await import("@/lib/firebase/collections");
  const db = adminDb();
  const premiosSnap = await cols
    .premios(db, localId)
    .where("activo", "==", true)
    .get();
  return premiosSnap.docs.map((d) => {
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
      nivelMinimoId: String(data.nivelMinimoId ?? "bronce"),
      categoria: data.categoria,
      stock:
        typeof data.stock === "number"
          ? data.stock
          : null,
      activo: data.activo !== false
    };
  });
}

async function loadCliente(localId: string, clienteId: string) {
  if (clienteId === "demo") {
    return {
      cliente: CLIENTE_DEMO,
      cfg: { ...CONFIGURACION_DEFAULT, localId } as ConfiguracionLocal,
      nombreLocal: NOMBRE_LOCAL_DEMO,
      historial: [
        {
          id: "demo-v1",
          fecha: new Date(Date.now() - 3 * 86_400_000).toISOString(),
          huellitasGeneradas: 12
        },
        {
          id: "demo-v2",
          fecha: new Date(Date.now() - 10 * 86_400_000).toISOString(),
          huellitasGeneradas: 8
        }
      ] satisfies HistorialPuntoCliente[],
      premios: PREMIOS_DEMO
    };
  }
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    const { cols } = await import("@/lib/firebase/collections");
    const { getConfiguracion } = await import("@/lib/huellitas/service");
    const db = adminDb();
    const cliSnap = await cols.cliente(db, localId, clienteId).get();
    if (!cliSnap.exists) return null;
    const cliente = cliSnap.data() as {
      nombre: string;
      saldoHuellitas?: number;
      huellitasReservadas?: number;
      acumuladoHistorico?: number;
      codigoReferido?: string;
      referidosTotales?: number;
      referidosActivados?: number;
    };
    const cfg = await getConfiguracion(localId);
    const localSnap = await cols.local(db, localId).get();
    const nombreLocal =
      (localSnap.data() as { nombre?: string } | undefined)?.nombre ??
      "tu Pet Shop";
    const [historial, premios] = await Promise.all([
      historialVentasCliente(localId, clienteId),
      premiosActivosCliente(localId)
    ]);
    return {
      cliente: {
        id: cliSnap.id,
        nombre: cliente.nombre,
        saldoHuellitas: cliente.saldoHuellitas ?? 0,
        huellitasReservadas: Number(cliente.huellitasReservadas ?? 0),
        acumuladoHistorico: cliente.acumuladoHistorico ?? 0,
        codigoReferido: cliente.codigoReferido ?? "",
        referidosTotales: cliente.referidosTotales ?? 0,
        referidosActivados: cliente.referidosActivados ?? 0,
        huellitasGanadasReferidos:
          (cliente.referidosActivados ?? 0) * cfg.referidos.bonusReferente
      },
      cfg,
      nombreLocal,
      historial,
      premios
    };
  } catch {
    return null;
  }
}

export default async function ClientePage({
  params,
  searchParams
}: {
  params: { clienteId: string };
  searchParams?: { localId?: string };
}) {
  const localId = searchParams?.localId?.trim();
  if (!localId) notFound();

  await requiereAccesoClientePublico(localId, params.clienteId);

  const data = await loadCliente(localId, params.clienteId);
  if (!data) notFound();

  const infoLocal = await getInfoLocal(localId);
  const membresiaExpirada = isMembresiaExpirada(infoLocal);

  const saldoBruto = data.cliente.saldoHuellitas;
  const reservadas = data.cliente.huellitasReservadas ?? 0;
  const saldoDisponible = Math.max(0, saldoBruto - reservadas);
  const modoDemo = params.clienteId === "demo";
  const baseUrl = resolvePublicBaseUrl(headers());
  const nivelCliente = calcularNivelCliente(data.cliente, data.cfg.niveles);

  return (
    <ClienteView
      localId={localId}
      cliente={data.cliente}
      cfg={data.cfg}
      nombreLocal={data.nombreLocal}
      baseUrl={baseUrl}
      membresiaExpirada={membresiaExpirada}
      historialPuntos={data.historial}
      premios={data.premios}
      saldoDisponible={saldoDisponible}
      huellitasReservadas={reservadas}
      modoDemo={modoDemo}
      nivelCliente={nivelCliente}
    />
  );
}
