import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ClienteView } from "./ClienteView";
import { getInfoLocal } from "@/lib/huellitas/localService";
import { isMembresiaExpirada } from "@/lib/huellitas/membresia";
import {
  CONFIGURACION_DEFAULT,
  type ConfiguracionLocal,
  type Cliente,
  type Mascota
} from "@/lib/huellitas/types";

const NOMBRE_LOCAL_DEMO = "Pet Shop Patitas";

const CLIENTE_DEMO = {
  id: "demo",
  nombre: "Lucía Romero",
  saldoHuellitas: 142,
  /**
   * 1340 huellitas históricas → Explorador (umbral 500), faltan 660
   * para Gran Guardián. Ideal para ver la barra de progreso a mitad de camino.
   */
  acumuladoHistorico: 1340,
  codigoReferido: "LUC-K3MP",
  referidosTotales: 4,
  referidosActivados: 2,
  /** Estimación: 2 activos × 30 huellitas bonus por defecto. */
  huellitasGanadasReferidos: 60,
  mascotas: [
    {
      id: "m1",
      nombre: "Coco",
      especie: "perro",
      raza: "Caniche toy",
      fechaNacimiento: new Date(Date.now() - 4 * 365 * 86_400_000)
        .toISOString()
        .slice(0, 10),
      sexo: "macho",
      color: "Blanco",
      pesoKg: 4.2,
      esterilizado: true,
      planAlimenticio: "balanceado-premium",
      marcaAlimentoFavorita: "Royal Canin Mini"
    },
    {
      id: "m2",
      nombre: "Luna",
      especie: "gato",
      raza: "Siamés",
      fechaNacimiento: new Date().toISOString().slice(0, 10),
      sexo: "hembra"
    }
  ] satisfies Mascota[]
};

async function loadCliente(localId: string, clienteId: string) {
  if (clienteId === "demo") {
    return {
      cliente: CLIENTE_DEMO,
      cfg: { ...CONFIGURACION_DEFAULT, localId } as ConfiguracionLocal,
      nombreLocal: NOMBRE_LOCAL_DEMO
    };
  }
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    const { cols } = await import("@/lib/firebase/collections");
    const { getConfiguracion } = await import("@/lib/huellitas/service");
    const db = adminDb();
    const cliSnap = await cols.cliente(db, localId, clienteId).get();
    if (!cliSnap.exists) return null;
    const cliente = cliSnap.data() as Cliente;
    const mascotasSnap = await cols.mascotas(db, localId, clienteId).get();
    const mascotas = mascotasSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Mascota)
    }));
    const cfg = await getConfiguracion(localId);
    const localSnap = await cols.local(db, localId).get();
    const nombreLocal =
      (localSnap.data() as { nombre?: string } | undefined)?.nombre ??
      "tu Pet Shop";
    return {
      cliente: {
        id: cliSnap.id,
        nombre: cliente.nombre,
        saldoHuellitas: cliente.saldoHuellitas ?? 0,
        acumuladoHistorico: cliente.acumuladoHistorico ?? 0,
        codigoReferido: cliente.codigoReferido ?? "",
        referidosTotales: cliente.referidosTotales ?? 0,
        referidosActivados: cliente.referidosActivados ?? 0,
        huellitasGanadasReferidos:
          (cliente.referidosActivados ?? 0) * cfg.referidos.bonusReferente,
        mascotas
      },
      cfg,
      nombreLocal
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

  const data = await loadCliente(localId, params.clienteId);
  if (!data) notFound();

  const infoLocal = await getInfoLocal(localId);
  const membresiaExpirada = isMembresiaExpirada(infoLocal);

  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  return (
    <ClienteView
      localId={localId}
      cliente={data.cliente}
      cfg={data.cfg}
      nombreLocal={data.nombreLocal}
      baseUrl={baseUrl}
      membresiaExpirada={membresiaExpirada}
    />
  );
}
