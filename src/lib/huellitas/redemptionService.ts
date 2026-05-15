import {
  FieldValue,
  type Firestore,
  type Transaction
} from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import {
  calcularNivel,
  planConsumoFIFO,
  saldoVigente,
  type ConsumoLote
} from "./engine";
import { generarCodigoCanje, validarCanje } from "./canjes";
import { getConfiguracion } from "./service";
import type { Cliente, LoteHuellitas, Premio } from "./types";

export type OrigenCanje = "app" | "manual" | "confirmacion";

export interface HandleRedemptionInput {
  localId: string;
  clienteId: string;
  premioId: string;
  origen: OrigenCanje;
  adminUid?: string;
}

export interface HandleRedemptionOutput {
  ok: true;
  logId: string;
  canjeId: string;
  clienteNombre: string;
  premioNombre: string;
  huellitasDescontadas: number;
  saldoFinal: number;
  stockRestante: number | null;
}

function calcularValorDescuento(
  premio: Premio,
  valorMonetarioHuellita: number
): number {
  if (typeof premio.valorDescuento === "number" && premio.valorDescuento >= 0) {
    return premio.valorDescuento;
  }
  return Math.max(0, premio.costoHuellitas) * Math.max(0, valorMonetarioHuellita);
}

function escribirLogCanje(
  db: Firestore,
  tx: Transaction,
  localId: string,
  payload: Record<string, unknown>
): string {
  const ref = cols.logsCanjes(db, localId).doc();
  tx.set(ref, {
    ...payload,
    creadoEn: FieldValue.serverTimestamp()
  });
  return ref.id;
}

/**
 * Canje atómico: valida puntos, descuenta FIFO, baja stock y registra en logs_canjes.
 * Usado para canje manual en caja (entrega inmediata).
 */
export async function handleRedemption(
  input: HandleRedemptionInput
): Promise<HandleRedemptionOutput> {
  const db = adminDb();
  const cfg = await getConfiguracion(input.localId);
  const clienteRef = cols.cliente(db, input.localId, input.clienteId);
  const premioRef = cols.premio(db, input.localId, input.premioId);
  const codigo = generarCodigoCanje(6);
  const canjeRef = cols.canjes(db, input.localId).doc(codigo);

  return db.runTransaction(async (tx) => {
    const [clienteSnap, premioSnap, canjeSnap] = await Promise.all([
      tx.get(clienteRef),
      tx.get(premioRef),
      tx.get(canjeRef)
    ]);

    if (canjeSnap.exists) {
      throw new Error("Colisión de código, intentá de nuevo.");
    }
    if (!clienteSnap.exists) throw new Error("Cliente inexistente.");
    if (!premioSnap.exists) throw new Error("Premio inexistente.");

    const cliente = clienteSnap.data() as Cliente;
    const premio = {
      id: premioSnap.id,
      ...(premioSnap.data() as Omit<Premio, "id">)
    };

    const lotesSnap = await tx.get(
      cols.huellitas(db, input.localId, input.clienteId)
    );
    const lotes: LoteHuellitas[] = lotesSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<LoteHuellitas, "id">)
    }));

    const saldoReal = saldoVigente(lotes);
    const nivelCliente = calcularNivel(
      cliente.acumuladoHistorico ?? 0,
      cfg.niveles
    );
    const validacion = validarCanje({
      premio,
      saldoCliente: saldoReal,
      nivelCliente,
      niveles: cfg.niveles
    });
    if (!validacion.ok) {
      throw new Error(validacion.motivo ?? "No se puede canjear este premio.");
    }

    const plan = planConsumoFIFO(lotes, premio.costoHuellitas);
    const valorDescuento = calcularValorDescuento(
      premio,
      cfg.valorMonetarioHuellita
    );

    for (const c of plan) {
      const loteRef = cols
        .huellitas(db, input.localId, input.clienteId)
        .doc(c.loteId);
      tx.update(loteRef, {
        huellitasRestantes: FieldValue.increment(-c.consumidas)
      });
    }

    const saldoFinal = Math.max(
      0,
      (cliente.saldoHuellitas ?? 0) - premio.costoHuellitas
    );
    tx.update(clienteRef, { saldoHuellitas: saldoFinal });

    let stockRestante: number | null = null;
    const stock = premio.stock;
    if (typeof stock === "number" && stock > 0) {
      stockRestante = stock - 1;
      tx.update(premioRef, { stock: FieldValue.increment(-1) });
    } else if (typeof stock === "number") {
      stockRestante = stock;
    }

    const ahora = new Date().toISOString();
    tx.set(canjeRef, {
      localId: input.localId,
      clienteId: input.clienteId,
      clienteNombre: cliente.nombre,
      premioId: premio.id ?? input.premioId,
      premioNombre: premio.nombre,
      costoHuellitas: premio.costoHuellitas,
      valorDescuento,
      valor_descuento: valorDescuento,
      codigo,
      estado: "completado",
      origen: input.origen,
      creadoEn: ahora,
      confirmadoEn: ahora,
      confirmadoPor: input.adminUid ?? null,
      plan
    });

    const logId = escribirLogCanje(db, tx, input.localId, {
      localId: input.localId,
      clienteId: input.clienteId,
      clienteNombre: cliente.nombre,
      premioId: premio.id ?? input.premioId,
      premioNombre: premio.nombre,
      huellitasDescontadas: premio.costoHuellitas,
      valorDescuento,
      stockRestante,
      origen: input.origen,
      canjeId: codigo,
      adminUid: input.adminUid ?? null
    });

    return {
      ok: true as const,
      logId,
      canjeId: codigo,
      clienteNombre: cliente.nombre,
      premioNombre: premio.nombre,
      huellitasDescontadas: premio.costoHuellitas,
      saldoFinal,
      stockRestante
    };
  });
}

export interface NotificacionCanjeInput {
  localId: string;
  clienteId: string;
  clienteNombre: string;
  premioId: string;
  premioNombre: string;
  codigo: string;
  costoHuellitas: number;
  stockRestante: number | null;
}

/** Alerta para el dashboard del dueño cuando un cliente genera un canje desde la app. */
export async function crearNotificacionCanjeDueno(
  input: NotificacionCanjeInput
): Promise<void> {
  const db = adminDb();
  await cols.notificacionesCanjes(db, input.localId).add({
    ...input,
    leida: false,
    creadoEn: new Date().toISOString()
  });
}

export async function listarNotificacionesCanjes(
  localId: string,
  opts?: { soloNoLeidas?: boolean; limite?: number }
): Promise<
  Array<NotificacionCanjeInput & { id: string; leida: boolean; creadoEn: string }>
> {
  const db = adminDb();
  const snap = await cols
    .notificacionesCanjes(db, localId)
    .orderBy("creadoEn", "desc")
    .limit(opts?.limite ?? 30)
    .get();

  return snap.docs
    .map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      localId: String(data.localId ?? localId),
      clienteId: String(data.clienteId),
      clienteNombre: String(data.clienteNombre),
      premioId: String(data.premioId),
      premioNombre: String(data.premioNombre),
      codigo: String(data.codigo),
      costoHuellitas: Number(data.costoHuellitas),
      stockRestante:
        typeof data.stockRestante === "number" ? data.stockRestante : null,
      leida: data.leida === true,
      creadoEn: String(data.creadoEn ?? "")
    };
  })
    .filter((n) => (opts?.soloNoLeidas ? !n.leida : true));
}

export async function marcarNotificacionesCanjeLeidas(
  localId: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const db = adminDb();
  const batch = db.batch();
  for (const id of ids) {
    batch.update(cols.notificacionesCanjes(db, localId).doc(id), {
      leida: true
    });
  }
  await batch.commit();
}

/** Registra en logs_canjes al confirmar un ticket pendiente (cola o legacy). */
export function registrarLogCanjeEnTx(
  db: Firestore,
  tx: Transaction,
  localId: string,
  payload: Record<string, unknown>
): string {
  return escribirLogCanje(db, tx, localId, payload);
}
