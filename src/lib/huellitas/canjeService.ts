import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { calcularNivel, planConsumoFIFO, saldoVigente } from "./engine";
import {
  fechaExpiracionTicket,
  generarCodigoCanje,
  tickectExpirado,
  validarCanje
} from "./canjes";
import { getConfiguracion } from "./service";
import type {
  CanjePendiente,
  Cliente,
  EstadoCanje,
  LoteHuellitas,
  Premio
} from "./types";

const MAX_INTENTOS_CODIGO = 6;

// ──────────────────────────────────────────────────────────────────────────────
// Cliente: crea ticket pendiente (NO descuenta saldo)
// ──────────────────────────────────────────────────────────────────────────────

export interface CrearTicketInput {
  localId: string;
  clienteId: string;
  premioId: string;
}

export interface CrearTicketOutput {
  canjeId: string;
  codigo: string;
  expiraEn: string;
  premio: { id: string; nombre: string; costoHuellitas: number };
  clienteNombre: string;
}

export async function crearTicketCanje(
  input: CrearTicketInput
): Promise<CrearTicketOutput> {
  const db = adminDb();
  const cfg = await getConfiguracion(input.localId);

  const [clienteSnap, premioSnap] = await Promise.all([
    cols.cliente(db, input.localId, input.clienteId).get(),
    cols.premio(db, input.localId, input.premioId).get()
  ]);

  if (!clienteSnap.exists) throw new Error("Cliente inexistente");
  if (!premioSnap.exists) throw new Error("Premio inexistente");

  const cliente = clienteSnap.data() as Cliente;
  const premio = { id: premioSnap.id, ...(premioSnap.data() as Omit<Premio, "id">) };

  const nivelCliente = calcularNivel(cliente.acumuladoHistorico ?? 0, cfg.niveles);
  const validacion = validarCanje({
    premio,
    saldoCliente: cliente.saldoHuellitas ?? 0,
    nivelCliente,
    niveles: cfg.niveles
  });
  if (!validacion.ok) {
    throw new Error(validacion.motivo ?? "No se puede canjear este premio");
  }

  // Idempotencia ligera: si el cliente ya tiene un ticket pendiente NO expirado
  // del mismo premio, devolvemos ése en lugar de crear duplicado.
  const existente = await cols
    .canjesPendientes(db, input.localId)
    .where("clienteId", "==", input.clienteId)
    .where("premioId", "==", input.premioId)
    .where("estado", "==", "pendiente")
    .limit(5)
    .get()
    .catch(() => null);
  if (existente && !existente.empty) {
    for (const d of existente.docs) {
      const data = d.data() as CanjePendiente;
      if (!tickectExpirado(data.expiraEn)) {
        return {
          canjeId: d.id,
          codigo: data.codigo,
          expiraEn: data.expiraEn,
          premio: {
            id: premio.id ?? input.premioId,
            nombre: premio.nombre,
            costoHuellitas: premio.costoHuellitas
          },
          clienteNombre: cliente.nombre
        };
      }
    }
  }

  // Generar código único transaccionalmente
  const expiraEn = fechaExpiracionTicket(24);
  let codigo = "";
  let canjeRef: DocumentReference | null = null;

  for (let i = 0; i < MAX_INTENTOS_CODIGO; i++) {
    const candidato = generarCodigoCanje(6);
    const ref = cols.canjePendiente(db, input.localId, candidato);
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists) throw new Error("colision");
        const payload: CanjePendiente = {
          localId: input.localId,
          clienteId: input.clienteId,
          clienteNombre: cliente.nombre,
          premioId: premio.id ?? input.premioId,
          premioNombre: premio.nombre,
          costoHuellitas: premio.costoHuellitas,
          codigo: candidato,
          estado: "pendiente",
          creadoEn: new Date().toISOString(),
          expiraEn
        };
        tx.set(ref, payload);
      });
      codigo = candidato;
      canjeRef = ref;
      break;
    } catch (e) {
      if (e instanceof Error && e.message === "colision") continue;
      throw e;
    }
  }

  if (!codigo || !canjeRef) {
    throw new Error("No se pudo generar un código único, reintentá");
  }

  return {
    canjeId: codigo, // el doc id ES el código
    codigo,
    expiraEn,
    premio: {
      id: premio.id ?? input.premioId,
      nombre: premio.nombre,
      costoHuellitas: premio.costoHuellitas
    },
    clienteNombre: cliente.nombre
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Cliente: cancelar su propio ticket pendiente
// ──────────────────────────────────────────────────────────────────────────────

export async function cancelarTicketCanje(input: {
  localId: string;
  clienteId: string;
  codigo: string;
}): Promise<void> {
  const db = adminDb();
  const ref = cols.canjePendiente(db, input.localId, input.codigo);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Ticket no encontrado");
    const data = snap.data() as CanjePendiente;
    if (data.clienteId !== input.clienteId) {
      throw new Error("Este ticket no es tuyo");
    }
    if (data.estado !== "pendiente") {
      throw new Error(`Ticket ya está en estado: ${data.estado}`);
    }
    tx.update(ref, {
      estado: "cancelado" as EstadoCanje,
      confirmadoEn: new Date().toISOString()
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Admin: lista de tickets pendientes del local
// ──────────────────────────────────────────────────────────────────────────────

export interface CanjePendienteResumen extends CanjePendiente {
  id: string;
  expirado: boolean;
}

export async function listarTicketsPendientes(
  localId: string
): Promise<CanjePendienteResumen[]> {
  const db = adminDb();
  // Sin orderBy + where compuesto para evitar índice custom: filtramos en
  // memoria. Suficiente porque hay pocos tickets pendientes a la vez.
  const snap = await cols
    .canjesPendientes(db, localId)
    .where("estado", "==", "pendiente")
    .limit(100)
    .get();
  const ahora = new Date();
  const items: CanjePendienteResumen[] = snap.docs.map((d) => {
    const data = d.data() as CanjePendiente;
    return {
      ...data,
      id: d.id,
      expirado: tickectExpirado(data.expiraEn, ahora)
    };
  });
  // Más recientes primero
  items.sort((a, b) => {
    const tA = String(a.creadoEn ?? "");
    const tB = String(b.creadoEn ?? "");
    return tB.localeCompare(tA);
  });
  return items;
}

// ──────────────────────────────────────────────────────────────────────────────
// Admin: confirmar canje (acá SÍ se descuentan las huellitas FIFO)
// ──────────────────────────────────────────────────────────────────────────────

export interface ConfirmarTicketInput {
  localId: string;
  /** Código (=docId del ticket). */
  codigo: string;
  adminUid: string;
}

export interface ConfirmarTicketOutput {
  ok: true;
  canjeId: string;
  clienteId: string;
  premioNombre: string;
  huellitasDescontadas: number;
  saldoFinal: number;
}

export async function confirmarTicketCanje(
  input: ConfirmarTicketInput
): Promise<ConfirmarTicketOutput> {
  const db = adminDb();
  const codigo = input.codigo.trim().toUpperCase();
  const ticketRef = cols.canjePendiente(db, input.localId, codigo);

  return db.runTransaction(async (tx) => {
    const ticketSnap = await tx.get(ticketRef);
    if (!ticketSnap.exists) throw new Error("Ticket inexistente");
    const ticket = ticketSnap.data() as CanjePendiente;

    if (ticket.estado === "completado") {
      throw new Error("Este ticket ya fue canjeado");
    }
    if (ticket.estado === "cancelado") {
      throw new Error("Este ticket fue cancelado");
    }
    if (tickectExpirado(ticket.expiraEn)) {
      tx.update(ticketRef, { estado: "expirado" as EstadoCanje });
      throw new Error("Este ticket expiró");
    }

    const clienteRef = cols.cliente(db, input.localId, ticket.clienteId);
    const clienteSnap = await tx.get(clienteRef);
    if (!clienteSnap.exists) throw new Error("Cliente inexistente");
    const cliente = clienteSnap.data() as Cliente;

    const lotesSnap = await tx.get(
      cols.huellitas(db, input.localId, ticket.clienteId)
    );
    const lotes: LoteHuellitas[] = lotesSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<LoteHuellitas, "id">)
    }));

    const saldo = saldoVigente(lotes);
    if (saldo < ticket.costoHuellitas) {
      throw new Error(
        `Saldo insuficiente: hay ${saldo} y el ticket cuesta ${ticket.costoHuellitas}`
      );
    }

    // FIFO: consumir lotes
    const plan = planConsumoFIFO(lotes, ticket.costoHuellitas);

    for (const c of plan) {
      const loteRef = cols
        .huellitas(db, input.localId, ticket.clienteId)
        .doc(c.loteId);
      tx.update(loteRef, {
        huellitasRestantes: FieldValue.increment(-c.consumidas)
      });
    }

    // Registro definitivo del canje (auditoría)
    const canjeRef = cols.canjes(db, input.localId).doc();
    tx.set(canjeRef, {
      localId: input.localId,
      clienteId: ticket.clienteId,
      ticketId: codigo,
      premioId: ticket.premioId,
      premioNombre: ticket.premioNombre,
      huellitasCanjeadas: ticket.costoHuellitas,
      plan,
      fecha: FieldValue.serverTimestamp(),
      confirmadoPor: input.adminUid
    });

    // Marcar ticket como completado
    tx.update(ticketRef, {
      estado: "completado" as EstadoCanje,
      confirmadoEn: new Date().toISOString(),
      confirmadoPor: input.adminUid
    });

    // Actualizar saldo cache del cliente
    const saldoFinal = (cliente.saldoHuellitas ?? 0) - ticket.costoHuellitas;
    tx.update(clienteRef, {
      saldoHuellitas: Math.max(0, saldoFinal)
    });

    // Decrementar stock del premio si está limitado
    const premioRef = cols.premio(db, input.localId, ticket.premioId);
    const premioSnap = await tx.get(premioRef);
    if (premioSnap.exists) {
      const stock = (premioSnap.data() as Premio).stock;
      if (typeof stock === "number" && stock > 0) {
        tx.update(premioRef, { stock: FieldValue.increment(-1) });
      }
    }

    return {
      ok: true as const,
      canjeId: canjeRef.id,
      clienteId: ticket.clienteId,
      premioNombre: ticket.premioNombre,
      huellitasDescontadas: ticket.costoHuellitas,
      saldoFinal: Math.max(0, saldoFinal)
    };
  });
}
