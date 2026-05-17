import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import {
  planConsumoFIFO,
  saldoVigente,
  type ConsumoLote
} from "@/lib/huellitas/engine";
import {
  clienteCumpleNivelSorteo,
  labelFiltroNivel,
  seleccionarGanadorPonderado,
  umbralNivelMinimoSorteo
} from "@/lib/huellitas/sorteosUtils";
import {
  leerHuellitasActuales,
  leerHuellitasHistoricas,
  patchSoloHuellitasActuales
} from "@/lib/huellitas/saldosCliente";
import { getConfiguracion } from "@/lib/huellitas/service";
import type { LoteHuellitas, NivelLealtad } from "@/lib/huellitas/types";
import {
  notificarGanadorSorteo,
  notificarLanzamientoSorteo
} from "@/lib/notifications/sorteosNotificaciones";
import {
  COSTO_BOOST_DUPLICAR,
  COSTO_BOOST_TRIPLICAR,
  PESO_BASE,
  PESO_DUPLICAR,
  PESO_TRIPLICAR,
  type ClienteElegibleSorteo,
  type ParticipanteSorteo,
  type Sorteo
} from "@/lib/huellitas/sorteosTypes";


export type FinalizarSorteoResult = {
  ganadorId: string | null;
  ganadorNombre: string | null;
  totalPesos: number;
  premio: string;
  emailGanadorEnviado: boolean;
};

export type CrearSorteoInput = {
  premio: string;
  descripcion: string;
  imagen?: string;
  fechaHoraFin: string;
  nivelMinimo: string;
};


export async function listarClientesElegiblesSorteo(
  localId: string,
  nivelMinimo: string,
  niveles: NivelLealtad[]
): Promise<ClienteElegibleSorteo[]> {
  const db = adminDb();
  const umbral = umbralNivelMinimoSorteo(nivelMinimo, niveles);
  const snap = await cols.clientes(db, localId).get();
  const out: ClienteElegibleSorteo[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const historico = leerHuellitasHistoricas(data);
    if (historico < umbral) continue;
    const nombre = String(data.nombre ?? "").trim();
    if (!nombre) continue;
    out.push({
      clienteId: doc.id,
      nombre,
      email: String(data.email ?? "").trim(),
      telefono: String(data.telefono ?? data.phone ?? "").trim(),
      peso: PESO_BASE
    });
  }

  return out;
}

function participantesDesdeElegibles(
  elegibles: ClienteElegibleSorteo[]
): ParticipanteSorteo[] {
  return elegibles.map((c) => ({ clienteId: c.clienteId, peso: c.peso }));
}

function mapSorteo(id: string, localId: string, data: Record<string, unknown>): Sorteo {
  return {
    id,
    localId,
    premio: String(data.premio ?? ""),
    descripcion: String(data.descripcion ?? ""),
    imagen: data.imagen ? String(data.imagen) : undefined,
    fechaHoraFin: String(data.fechaHoraFin ?? ""),
    estado: data.estado === "terminado" ? "terminado" : "activo",
    nivelMinimo: String(data.nivelMinimo ?? "todos"),
    participantes: Array.isArray(data.participantes)
      ? (data.participantes as ParticipanteSorteo[])
      : [],
    ganadorId:
      data.ganadorId === null || data.ganadorId === undefined
        ? null
        : String(data.ganadorId),
    ganadorNombre:
      data.ganadorNombre === null || data.ganadorNombre === undefined
        ? null
        : data.ganadorNombre
          ? String(data.ganadorNombre)
          : null,
    finalizadoEn: data.finalizadoEn ? String(data.finalizadoEn) : undefined,
    creadoEn: data.creadoEn ? String(data.creadoEn) : undefined
  };
}

export async function crearSorteo(
  localId: string,
  input: CrearSorteoInput
): Promise<Sorteo> {
  const fin = new Date(input.fechaHoraFin);
  if (Number.isNaN(fin.getTime())) {
    throw new Error("Fecha y hora de fin inválidas.");
  }
  if (fin.getTime() <= Date.now()) {
    throw new Error("La fecha de fin debe ser futura.");
  }

  const cfg = await getConfiguracion(localId);
  const elegibles = await listarClientesElegiblesSorteo(
    localId,
    input.nivelMinimo,
    cfg.niveles
  );
  const participantes = participantesDesdeElegibles(elegibles);

  if (participantes.length === 0) {
    throw new Error(
      "Ningún cliente cumple el nivel mínimo seleccionado. Ajustá el filtro o registrá más clientes."
    );
  }

  const db = adminDb();
  const ref = cols.sorteos(db, localId).doc();
  const payload = {
    localId,
    premio: input.premio.trim(),
    descripcion: input.descripcion.trim(),
    imagen: input.imagen?.trim() || null,
    fechaHoraFin: fin.toISOString(),
    estado: "activo" as const,
    nivelMinimo: input.nivelMinimo,
    participantes,
    ganadorId: null,
    creadoEn: new Date().toISOString()
  };

  await ref.set(payload);
  const sorteo = mapSorteo(ref.id, localId, payload as Record<string, unknown>);

  void notificarLanzamientoSorteo({ localId, sorteo, elegibles }).catch((err) =>
    console.error("[sorteos] notificaciones lanzamiento", err)
  );

  return sorteo;
}

export async function listarSorteosAdmin(localId: string): Promise<Sorteo[]> {
  const db = adminDb();
  const snap = await cols
    .sorteos(db, localId)
    .orderBy("creadoEn", "desc")
    .limit(50)
    .get()
    .catch(async () => {
      const fallback = await cols.sorteos(db, localId).get();
      return fallback;
    });

  return snap.docs.map((d) =>
    mapSorteo(d.id, localId, d.data() as Record<string, unknown>)
  );
}

export type SorteoVistaCliente = Sorteo & {
  miPeso: number;
  elegible: boolean;
  totalPesos: number;
  ganadorSoyYo?: boolean;
};

export async function listarSorteosParaCliente(
  localId: string,
  clienteId: string
): Promise<SorteoVistaCliente[]> {
  const db = adminDb();
  const cfg = await getConfiguracion(localId);
  const cliSnap = await cols.cliente(db, localId, clienteId).get();
  if (!cliSnap.exists) return [];

  const historico = leerHuellitasHistoricas(cliSnap.data() ?? {});
  const ahora = Date.now();
  const out: SorteoVistaCliente[] = [];

  const [activosSnap, terminadosSnap] = await Promise.all([
    cols.sorteos(db, localId).where("estado", "==", "activo").get(),
    cols.sorteos(db, localId).where("estado", "==", "terminado").get()
  ]);

  for (const doc of activosSnap.docs) {
    const s = mapSorteo(doc.id, localId, doc.data() as Record<string, unknown>);
    if (new Date(s.fechaHoraFin).getTime() <= ahora) continue;

    const participante = s.participantes.find((p) => p.clienteId === clienteId);
    const elegible = clienteCumpleNivelSorteo(
      historico,
      s.nivelMinimo,
      cfg.niveles
    );
    const totalPesos = s.participantes.reduce((acc, p) => acc + p.peso, 0);

    out.push({
      ...s,
      miPeso: participante?.peso ?? 0,
      elegible,
      totalPesos
    });
  }

  for (const doc of terminadosSnap.docs) {
    const s = mapSorteo(doc.id, localId, doc.data() as Record<string, unknown>);
    const participante = s.participantes.find((p) => p.clienteId === clienteId);
    if (!participante) continue;

    const totalPesos = s.participantes.reduce((acc, p) => acc + p.peso, 0);
    out.push({
      ...s,
      miPeso: participante.peso,
      elegible: true,
      totalPesos,
      ganadorSoyYo: s.ganadorId === clienteId
    });
  }

  out.sort((a, b) => {
    if (a.estado !== b.estado) return a.estado === "activo" ? -1 : 1;
    if (a.estado === "terminado" && b.estado === "terminado") {
      const fa = a.finalizadoEn ? new Date(a.finalizadoEn).getTime() : 0;
      const fb = b.finalizadoEn ? new Date(b.finalizadoEn).getTime() : 0;
      return fb - fa;
    }
    return new Date(a.fechaHoraFin).getTime() - new Date(b.fechaHoraFin).getTime();
  });

  return out;
}

export async function listarSorteosActivosCliente(
  localId: string,
  clienteId: string
): Promise<SorteoVistaCliente[]> {
  const todos = await listarSorteosParaCliente(localId, clienteId);
  return todos.filter((s) => s.estado === "activo");
}

async function registrarTransaccionSorteo(
  localId: string,
  clienteId: string,
  data: {
    tipo: string;
    sorteoId: string;
    descripcion: string;
    huellitas: number;
    pesoResultante: number;
  }
): Promise<void> {
  const db = adminDb();
  await cols.transaccionesCliente(db, localId, clienteId).add({
    ...data,
    creadoEn: new Date().toISOString()
  });
}

export type TipoBoost = "duplicar" | "triplicar";

export async function comprarBoostSorteo(
  localId: string,
  clienteId: string,
  sorteoId: string,
  tipo: TipoBoost
): Promise<{ peso: number; saldoFinal: number }> {
  const costo = tipo === "duplicar" ? COSTO_BOOST_DUPLICAR : COSTO_BOOST_TRIPLICAR;
  const pesoObjetivo = tipo === "duplicar" ? PESO_DUPLICAR : PESO_TRIPLICAR;

  const db = adminDb();
  const sorteoRef = cols.sorteo(db, localId, sorteoId);
  const clienteRef = cols.cliente(db, localId, clienteId);

  const { pesoFinal, saldoFinal } = await db.runTransaction(async (tx) => {
    const [sorteoSnap, clienteSnap, lotesSnap] = await Promise.all([
      tx.get(sorteoRef),
      tx.get(clienteRef),
      tx.get(cols.huellitas(db, localId, clienteId))
    ]);

    if (!sorteoSnap.exists) throw new Error("Sorteo no encontrado.");
    if (!clienteSnap.exists) throw new Error("Cliente no encontrado.");

    const data = sorteoSnap.data() as Record<string, unknown>;
    if (data.estado !== "activo") {
      throw new Error("Este sorteo ya no está activo.");
    }
    if (new Date(String(data.fechaHoraFin)).getTime() <= Date.now()) {
      throw new Error("Este sorteo ya finalizó.");
    }

    const participantes = Array.isArray(data.participantes)
      ? ([...data.participantes] as ParticipanteSorteo[])
      : [];
    const idx = participantes.findIndex((p) => p.clienteId === clienteId);
    if (idx < 0) {
      throw new Error("No estás inscripto en este sorteo.");
    }

    const actual = participantes[idx]!;
    if (actual.peso >= pesoObjetivo) {
      throw new Error(
        tipo === "duplicar"
          ? "Ya tenés chances duplicadas o superiores."
          : "Ya tenés el máximo de chances (triplicadas)."
      );
    }

    const lotes: LoteHuellitas[] = lotesSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<LoteHuellitas, "id">)
    }));
    const saldoReal = saldoVigente(lotes);
    if (saldoReal < costo) {
      throw new Error(
        `Saldo insuficiente: tenés ${saldoReal} huellitas y el boost cuesta ${costo}.`
      );
    }

    const plan = planConsumoFIFO(lotes, costo);
    for (const c of plan) {
      tx.update(cols.huellitas(db, localId, clienteId).doc(c.loteId), {
        huellitasRestantes: FieldValue.increment(-c.consumidas)
      });
    }

    const saldoDoc = leerHuellitasActuales(clienteSnap.data() ?? {});
    const saldoFinalTx = Math.max(0, saldoDoc - costo);
    tx.update(clienteRef, patchSoloHuellitasActuales(saldoFinalTx));

    participantes[idx] = { ...actual, peso: pesoObjetivo };
    tx.update(sorteoRef, { participantes });

    return { pesoFinal: pesoObjetivo, saldoFinal: saldoFinalTx };
  });

  await registrarTransaccionSorteo(localId, clienteId, {
    tipo: tipo === "duplicar" ? "sorteo_boost_duplicar" : "sorteo_boost_triplicar",
    sorteoId,
    descripcion:
      tipo === "duplicar"
        ? `Boost sorteo: duplicar chances (${COSTO_BOOST_DUPLICAR} huellitas)`
        : `Boost sorteo: triplicar chances (${COSTO_BOOST_TRIPLICAR} huellitas)`,
    huellitas: -costo,
    pesoResultante: pesoFinal
  });

  return { peso: pesoFinal, saldoFinal };
}

export async function finalizarSorteo(
  localId: string,
  sorteoId: string
): Promise<FinalizarSorteoResult> {
  const db = adminDb();
  const ref = cols.sorteo(db, localId, sorteoId);

  const txOut = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Sorteo no encontrado.");

    const data = snap.data() as Record<string, unknown>;
    if (data.estado === "terminado") {
      throw new Error("Este sorteo ya fue finalizado.");
    }

    const participantes = Array.isArray(data.participantes)
      ? (data.participantes as ParticipanteSorteo[])
      : [];
    const totalPesos = participantes.reduce((s, p) => s + p.peso, 0);
    const ganadorId = seleccionarGanadorPonderado(participantes);
    const premio = String(data.premio ?? "");
    const descripcion = String(data.descripcion ?? "");

    let ganadorNombre: string | null = null;
    if (ganadorId) {
      const ganadorSnap = await tx.get(cols.cliente(db, localId, ganadorId));
      if (ganadorSnap.exists) {
        ganadorNombre =
          String(ganadorSnap.data()?.nombre ?? "").trim() || null;
      }
    }

    tx.update(ref, {
      estado: "terminado",
      ganadorId: ganadorId ?? null,
      ganadorNombre,
      finalizadoEn: new Date().toISOString()
    });

    return { ganadorId, ganadorNombre, totalPesos, premio, descripcion };
  });

  let emailGanadorEnviado = false;
  if (txOut.ganadorId && txOut.ganadorNombre) {
    try {
      emailGanadorEnviado = await notificarGanadorSorteo({
        localId,
        ganadorId: txOut.ganadorId,
        ganadorNombre: txOut.ganadorNombre,
        premio: txOut.premio,
        descripcion: txOut.descripcion
      });
    } catch (err) {
      console.error("[sorteos] email ganador", err);
    }
  }

  return {
    ganadorId: txOut.ganadorId,
    ganadorNombre: txOut.ganadorNombre,
    totalPesos: txOut.totalPesos,
    premio: txOut.premio,
    emailGanadorEnviado
  };
}

export { labelFiltroNivel, clienteCumpleNivelSorteo } from "@/lib/huellitas/sorteosUtils";
export type { ClienteElegibleSorteo } from "@/lib/huellitas/sorteosTypes";
