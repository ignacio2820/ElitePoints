import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { calcularNivel } from "@/lib/huellitas/engine";
import { UMBRAL_ALERTA_INSATISFACCION } from "@/lib/huellitas/encuestasConstants";
import type { EncuestaRespuesta } from "@/lib/huellitas/encuestasTypes";
import { leerHuellitasActuales, leerHuellitasHistoricas } from "@/lib/huellitas/saldosCliente";
import { incrementHuellitasActuales } from "@/lib/huellitas/saldosCliente.server";
import { getConfiguracion } from "@/lib/huellitas/service";
import type { NivelLealtad } from "@/lib/huellitas/types";

export type AlertaEncuestaAdmin = {
  encuestaId: string;
  clienteId: string;
  nombreCliente: string;
  nivel: NivelLealtad;
  huellitasHistoricas: number;
  puntuacion: number;
  comentario?: string;
  creadoEn: string;
  ventaId: string;
};

export async function listarAlertasEncuestaPendientes(
  localId: string
): Promise<AlertaEncuestaAdmin[]> {
  const db = adminDb();
  const cfg = await getConfiguracion(localId);
  const niveles = cfg.niveles;

  const snap = await cols
    .encuestas(db, localId)
    .where("requiereAtencion", "==", true)
    .limit(200)
    .get();

  const alertas: AlertaEncuestaAdmin[] = [];

  for (const doc of snap.docs) {
    const data = doc.data() as EncuestaRespuesta;
    if (data.estado === "resuelta") continue;
    if (data.puntuacion >= UMBRAL_ALERTA_INSATISFACCION) continue;

    const clienteSnap = await cols.cliente(db, localId, data.clienteId).get();
    const cliente = clienteSnap.data() ?? {};
    const historicas = leerHuellitasHistoricas(cliente);
    const nivel = calcularNivel(historicas, niveles);

    alertas.push({
      encuestaId: doc.id,
      clienteId: data.clienteId,
      nombreCliente: String(cliente.nombre ?? "Cliente").trim(),
      nivel,
      huellitasHistoricas: historicas,
      puntuacion: data.puntuacion,
      comentario: data.comentario,
      creadoEn: data.creadoEn ?? "",
      ventaId: data.ventaId
    });
  }

  alertas.sort((a, b) => (b.creadoEn > a.creadoEn ? 1 : -1));
  return alertas;
}

export async function aplicarDisculpaEncuesta(input: {
  localId: string;
  encuestaId: string;
  huellitas: number;
  nota: string;
  adminUid: string;
  adminEmail: string | null;
}): Promise<{ saldoFinal: number }> {
  const db = adminDb();
  const encuestaRef = cols.encuesta(db, input.localId, input.encuestaId);

  return db.runTransaction(async (tx) => {
    const encSnap = await tx.get(encuestaRef);
    if (!encSnap.exists) {
      throw new Error("Encuesta no encontrada.");
    }

    const enc = encSnap.data() as EncuestaRespuesta;
    if (!enc.requiereAtencion) {
      throw new Error("Esta encuesta no requiere atención.");
    }
    if (enc.estado === "resuelta") {
      throw new Error("Esta alerta ya fue resuelta.");
    }

    const clienteRef = cols.cliente(db, input.localId, enc.clienteId);
    const clienteSnap = await tx.get(clienteRef);
    if (!clienteSnap.exists) {
      throw new Error("Cliente no encontrado.");
    }

    const saldoPrev = leerHuellitasActuales(clienteSnap.data() ?? {});
    const saldoFinal = saldoPrev + input.huellitas;

    tx.update(encuestaRef, {
      estado: "resuelta",
      resueltoPorUid: input.adminUid,
      resueltoPorEmail: input.adminEmail,
      resueltoEn: new Date().toISOString(),
      disculpaHuellitas: input.huellitas,
      disculpaNota: input.nota.trim()
    });

    tx.update(clienteRef, incrementHuellitasActuales(input.huellitas));

    const transRef = cols
      .transaccionesCliente(db, input.localId, enc.clienteId)
      .doc();
    tx.set(transRef, {
      tipo: "recompensa_disculpa",
      encuestaId: input.encuestaId,
      ventaId: enc.ventaId,
      descripcion: "Recompensa por disculpa — recuperación de cliente",
      notaDisculpa: input.nota.trim(),
      huellitas: input.huellitas,
      saldoAnterior: saldoPrev,
      saldoPosterior: saldoFinal,
      resueltoPorUid: input.adminUid,
      creadoEn: new Date().toISOString()
    });

    return { saldoFinal };
  });
}
