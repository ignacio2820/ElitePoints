import {
  FieldValue,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  type Transaction
} from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import {
  calcularNivelCliente,
  leerHuellitasActuales,
  leerHuellitasHistoricas,
  patchSoloHuellitasActuales,
} from "@/lib/huellitas/saldosCliente";
import {
  calcularNivel,
  planConsumoFIFO,
  saldoVigente,
  type ConsumoLote
} from "./engine";
import {
  fechaExpiracionTicket,
  generarCodigoCanje,
  tickectExpirado,
  validarCanje
} from "./canjes";
import { getConfiguracion } from "./service";
import {
  crearNotificacionCanjeDueno,
  registrarLogCanjeEnTx
} from "./redemptionService";
import type {
  CanjePendiente,
  Cliente,
  EstadoCanje,
  LoteHuellitas,
  Premio
} from "./types";

/**
 * Canjes mutantes: crear ticket, cancelar y confirmar entrega usan siempre
 * `Firestore.runTransaction` para leer saldo/lotes/premio y escribir en un
 * solo commit atómico (sin doble descuento ni saldo negativo por carrera).
 */
const MAX_INTENTOS_CODIGO = 6;

function calcularValorDescuento(
  premio: Premio,
  valorMonetarioHuellita: number
): number {
  if (typeof premio.valorDescuento === "number" && premio.valorDescuento >= 0) {
    return premio.valorDescuento;
  }
  return Math.max(0, premio.costoHuellitas) * Math.max(0, valorMonetarioHuellita);
}

/** Canje guardado en /Locales/{localId}/Canjes/{codigo} con descuento FIFO ya aplicado. */
function esCanjeColaEntrega(data: Record<string, unknown>): boolean {
  return Array.isArray(data.plan) && (data.plan as unknown[]).length > 0;
}

// ──────────────────────────────────────────────────────────────────────────────
// Cliente: canjear → descuenta huellitas (FIFO) + doc en /Canjes estado pendiente
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
  premio: {
    id: string;
    nombre: string;
    costoHuellitas: number;
    valorDescuento: number;
  };
  clienteNombre: string;
  /** Saldo cache del cliente tras descontar las huellitas del premio. */
  saldoDisponibleFinal: number;
}

/**
 * Crea un canje en /Locales/{localId}/Canjes/{codigo} con estado `pendiente`.
 * En la misma transacción:
 *  - Valida premio + nivel + stock.
 *  - Verifica saldo real (lotes vigentes) >= costo.
 *  - Descuenta FIFO en subcolección Huellitas y actualiza `saldoHuellitas`.
 *  - Persiste `valorDescuento` y `valor_descuento` (mismo valor) en Firestore.
 */
export async function crearTicketCanje(
  input: CrearTicketInput
): Promise<CrearTicketOutput> {
  const db = adminDb();
  const cfg = await getConfiguracion(input.localId);

  const existente = await cols
    .canjes(db, input.localId)
    .where("clienteId", "==", input.clienteId)
    .where("premioId", "==", input.premioId)
    .where("estado", "==", "pendiente")
    .limit(5)
    .get()
    .catch(() => null);
  if (existente && !existente.empty) {
    for (const d of existente.docs) {
      const data = d.data() as Record<string, unknown>;
      const expiraEn = String(data.expiraEn ?? "");
      if (expiraEn && !tickectExpirado(expiraEn)) {
        const cliSnap = await cols
          .cliente(db, input.localId, input.clienteId)
          .get();
        const cli = (cliSnap.data() ?? {}) as Cliente;
        const vd =
          (data.valorDescuento as number | undefined) ??
          (data.valor_descuento as number | undefined) ??
          Number(data.costoHuellitas) * cfg.valorMonetarioHuellita;
        return {
          canjeId: d.id,
          codigo: String(data.codigo ?? d.id),
          expiraEn,
          premio: {
            id: String(data.premioId),
            nombre: String(data.premioNombre ?? ""),
            costoHuellitas: Number(data.costoHuellitas),
            valorDescuento: vd
          },
          clienteNombre: String(data.clienteNombre ?? ""),
          saldoDisponibleFinal: Math.max(0, leerHuellitasActuales(cli))
        };
      }
    }
  }

  const expiraEn = fechaExpiracionTicket(24);
  const clienteRef = cols.cliente(db, input.localId, input.clienteId);
  const premioRef = cols.premio(db, input.localId, input.premioId);

  for (let i = 0; i < MAX_INTENTOS_CODIGO; i++) {
    const candidato = generarCodigoCanje(6);
    const canjeRef = cols.canjes(db, input.localId).doc(candidato);

    try {
      const out = await db.runTransaction(async (tx) => {
        const [clienteSnap, premioSnap, canjeSnap] = await Promise.all([
          tx.get(clienteRef),
          tx.get(premioRef),
          tx.get(canjeRef)
        ]);

        if (canjeSnap.exists) throw new ColisionCodigoError();
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
        const nivelCliente = calcularNivelCliente(cliente, cfg.niveles);
        const validacion = validarCanje({
          premio,
          saldoCliente: saldoReal,
          nivelCliente,
          niveles: cfg.niveles
        });
        if (!validacion.ok) {
          throw new Error(
            validacion.motivo ?? "No se puede canjear este premio."
          );
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
          leerHuellitasActuales(cliente) - premio.costoHuellitas
        );
        tx.update(clienteRef, patchSoloHuellitasActuales(saldoFinal));

        const payload: Record<string, unknown> = {
          localId: input.localId,
          clienteId: input.clienteId,
          clienteNombre: cliente.nombre,
          premioId: premio.id ?? input.premioId,
          premioNombre: premio.nombre,
          costoHuellitas: premio.costoHuellitas,
          valorDescuento,
          valor_descuento: valorDescuento,
          codigo: candidato,
          estado: "pendiente" as EstadoCanje,
          creadoEn: new Date().toISOString(),
          expiraEn,
          plan
        };
        tx.set(canjeRef, payload);

        return {
          canjeId: candidato,
          codigo: candidato,
          expiraEn,
          premio: {
            id: premio.id ?? input.premioId,
            nombre: premio.nombre,
            costoHuellitas: premio.costoHuellitas,
            valorDescuento
          },
          clienteNombre: cliente.nombre,
          saldoDisponibleFinal: saldoFinal
        } satisfies CrearTicketOutput;
      });

      const premioSnap = await cols
        .premio(db, input.localId, input.premioId)
        .get();
      const stockPremio = premioSnap.exists
        ? (premioSnap.data() as Premio).stock
        : null;
      const stockRestante =
        typeof stockPremio === "number" ? stockPremio : null;

      void crearNotificacionCanjeDueno({
        localId: input.localId,
        clienteId: input.clienteId,
        clienteNombre: out.clienteNombre,
        premioId: input.premioId,
        premioNombre: out.premio.nombre,
        codigo: out.codigo,
        costoHuellitas: out.premio.costoHuellitas,
        stockRestante
      }).catch((e) =>
        console.error("[canje] notificación dueño:", e)
      );

      return out;
    } catch (err) {
      if (err instanceof ColisionCodigoError) continue;
      throw err;
    }
  }

  throw new Error(
    "No pudimos generar un código único, probá nuevamente en unos segundos."
  );
}

class ColisionCodigoError extends Error {
  constructor() {
    super("colision_codigo");
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Cliente: cancelar canje pendiente (solo cola nueva con plan)
// ──────────────────────────────────────────────────────────────────────────────

export async function cancelarTicketCanje(input: {
  localId: string;
  clienteId: string;
  codigo: string;
}): Promise<void> {
  const db = adminDb();
  const codigo = input.codigo.trim().toUpperCase();
  const canjeRef = cols.canjes(db, input.localId).doc(codigo);
  const clienteRef = cols.cliente(db, input.localId, input.clienteId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(canjeRef);
    if (!snap.exists) {
      await cancelarTicketLegacy(db, tx, input.localId, input.clienteId, codigo);
      return;
    }
    const data = snap.data() as Record<string, unknown>;
    if (String(data.clienteId) !== input.clienteId) {
      throw new Error("Este canje no es tuyo.");
    }
    if (data.estado !== "pendiente") {
      throw new Error(`El canje ya está en estado "${String(data.estado)}".`);
    }
    if (!esCanjeColaEntrega(data)) {
      throw new Error("Este canje no se puede cancelar desde acá.");
    }

    const plan = data.plan as ConsumoLote[];
    const costo = Number(data.costoHuellitas);
    const cliSnap = await tx.get(clienteRef);
    const cli = (cliSnap.data() ?? {}) as Cliente;

    for (const c of plan) {
      const loteRef = cols
        .huellitas(db, input.localId, input.clienteId)
        .doc(c.loteId);
      tx.update(loteRef, {
        huellitasRestantes: FieldValue.increment(c.consumidas)
      });
    }

    tx.update(clienteRef, {
      saldoHuellitas: Math.max(0, leerHuellitasActuales(cli) + costo)
    });

    tx.update(canjeRef, {
      estado: "cancelado" as EstadoCanje,
      confirmadoEn: new Date().toISOString()
    });
  });
}

async function cancelarTicketLegacy(
  db: Firestore,
  tx: Transaction,
  localId: string,
  clienteId: string,
  codigo: string
): Promise<void> {
  const ticketRef = cols.canjePendiente(db, localId, codigo);
  const clienteRef = cols.cliente(db, localId, clienteId);
  const snap = await tx.get(ticketRef);
  if (!snap.exists) throw new Error("Ticket no encontrado.");
  const data = snap.data() as CanjePendiente;

  if (data.clienteId !== clienteId) {
    throw new Error("Este ticket no es tuyo.");
  }
  if (data.estado !== "pendiente") {
    throw new Error(`El ticket ya está en estado "${data.estado}".`);
  }

  tx.update(ticketRef, {
    estado: "cancelado" as EstadoCanje,
    confirmadoEn: new Date().toISOString()
  });
  tx.update(clienteRef, {
    huellitasReservadas: FieldValue.increment(-data.costoHuellitas)
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Admin: lista de canjes pendientes (cola nueva + tickets legacy)
// ──────────────────────────────────────────────────────────────────────────────

export interface CanjePendienteResumen extends CanjePendiente {
  id: string;
  expirado: boolean;
}

function valorDescuentoDeDoc(data: Record<string, unknown>): number | undefined {
  const v = data.valorDescuento ?? data.valor_descuento;
  if (typeof v === "number" && v >= 0) return v;
  return undefined;
}

function docToResumen(
  id: string,
  data: Record<string, unknown>,
  ahora: Date
): CanjePendienteResumen {
  const expiraEn = String(data.expiraEn ?? "");
  return {
    ...(data as unknown as CanjePendiente),
    id,
    codigo: String(data.codigo ?? id),
    valorDescuento: valorDescuentoDeDoc(data),
    expirado: expiraEn ? tickectExpirado(expiraEn, ahora) : false
  };
}

export async function listarTicketsPendientes(
  localId: string
): Promise<CanjePendienteResumen[]> {
  const db = adminDb();
  const ahora = new Date();

  const [snapCola, snapLegacy] = await Promise.all([
    cols
      .canjes(db, localId)
      .where("estado", "==", "pendiente")
      .limit(100)
      .get(),
    cols
      .canjesPendientes(db, localId)
      .where("estado", "==", "pendiente")
      .limit(100)
      .get()
  ]);

  const mapa = new Map<string, CanjePendienteResumen>();

  for (const d of snapCola.docs) {
    const data = d.data() as Record<string, unknown>;
    if (data.estado !== "pendiente") continue;
    const codigo = String(data.codigo ?? d.id);
    mapa.set(codigo, docToResumen(d.id, { ...data, codigo }, ahora));
  }

  for (const d of snapLegacy.docs) {
    const data = d.data() as Record<string, unknown>;
    const codigo = String(data.codigo ?? d.id);
    if (!mapa.has(codigo)) {
      mapa.set(codigo, docToResumen(d.id, data as Record<string, unknown>, ahora));
    }
  }

  const items = [...mapa.values()];
  items.sort((a, b) => {
    const tA = String(a.creadoEn ?? "");
    const tB = String(b.creadoEn ?? "");
    return tB.localeCompare(tA);
  });
  return items;
}

export async function listarTicketsPendientesDeCliente(
  localId: string,
  clienteId: string
): Promise<CanjePendienteResumen[]> {
  const todos = await listarTicketsPendientes(localId);
  return todos
    .filter((t) => t.clienteId === clienteId && !t.expirado)
    .slice(0, 20);
}

// ──────────────────────────────────────────────────────────────────────────────
// Admin: confirmar entrega (cola nueva: solo marca + stock; legacy: FIFO aquí)
// ──────────────────────────────────────────────────────────────────────────────

export interface ConfirmarTicketInput {
  localId: string;
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
  const { localId, adminUid } = input;
  const codigo = input.codigo.trim().toUpperCase();
  const canjeRef = cols.canjes(db, localId).doc(codigo);
  const ticketLegacyRef = cols.canjePendiente(db, localId, codigo);

  return db.runTransaction(async (tx) => {
    // ── Fase 1: todas las lecturas (sin escrituras previas) ──
    const canjeSnap = await tx.get(canjeRef);
    const rawCanje = canjeSnap.exists
      ? (canjeSnap.data() as Record<string, unknown>)
      : null;
    const esCola = !!rawCanje && esCanjeColaEntrega(rawCanje);

    if (esCola && rawCanje) {
      const ticket = rawCanje;
      const clienteId = String(ticket.clienteId);
      const premioId = String(ticket.premioId);
      const clienteRef = cols.cliente(db, localId, clienteId);
      const premioRef = cols.premio(db, localId, premioId);

      const [clienteSnap, premioSnap] = await Promise.all([
        tx.get(clienteRef),
        tx.get(premioRef)
      ]);

      if (ticket.estado === "completado") {
        throw new Error("Este canje ya fue entregado.");
      }
      if (ticket.estado === "cancelado") {
        throw new Error("Este canje fue cancelado.");
      }

      const cliente = (clienteSnap.data() ?? {}) as Cliente;
      const costo = Number(ticket.costoHuellitas);

      if (tickectExpirado(String(ticket.expiraEn ?? ""))) {
        // Escrituras de expiración (lecturas ya hechas)
        escribirExpiracionCanjeCola(
          db,
          tx,
          localId,
          clienteId,
          canjeRef,
          ticket,
          cliente
        );
        throw new Error("Este canje expiró.");
      }

      // ── Fase 2: escrituras (cola: huellitas ya descontadas al crear ticket) ──
      tx.update(canjeRef, {
        estado: "completado" as EstadoCanje,
        confirmadoEn: new Date().toISOString(),
        confirmadoPor: adminUid
      });

      const stockRestante = aplicarDescuentoStockPremio(tx, premioRef, premioSnap);

      registrarLogCanjeEnTx(db, tx, localId, {
        localId,
        clienteId,
        clienteNombre: String(ticket.clienteNombre ?? cliente.nombre ?? ""),
        premioId,
        premioNombre: String(ticket.premioNombre ?? ""),
        huellitasDescontadas: costo,
        stockRestante,
        origen: "confirmacion",
        canjeId: codigo,
        adminUid
      });

      return {
        ok: true as const,
        canjeId: codigo,
        clienteId,
        premioNombre: String(ticket.premioNombre ?? ""),
        huellitasDescontadas: costo,
        saldoFinal: Math.max(0, cliente.saldoHuellitas ?? 0)
      };
    }

    // Ticket legacy en CanjesPendientes
    const ticketSnap = await tx.get(ticketLegacyRef);
    if (!ticketSnap.exists) {
      throw new Error("Canje inexistente.");
    }
    const ticket = ticketSnap.data() as CanjePendiente;

    if (ticket.estado === "completado") {
      throw new Error("Este ticket ya fue canjeado.");
    }
    if (ticket.estado === "cancelado") {
      throw new Error("Este ticket fue cancelado por el cliente.");
    }

    const clienteRef = cols.cliente(db, localId, ticket.clienteId);
    const premioRef = cols.premio(db, localId, ticket.premioId);

    const [clienteSnap, lotesSnap, premioSnap] = await Promise.all([
      tx.get(clienteRef),
      tx.get(cols.huellitas(db, localId, ticket.clienteId)),
      tx.get(premioRef)
    ]);

    if (!clienteSnap.exists) {
      throw new Error("Cliente inexistente.");
    }
    const cliente = clienteSnap.data() as Cliente;

    const lotes: LoteHuellitas[] = lotesSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<LoteHuellitas, "id">)
    }));

    if (tickectExpirado(ticket.expiraEn)) {
      tx.update(ticketLegacyRef, { estado: "expirado" as EstadoCanje });
      tx.update(clienteRef, {
        huellitasReservadas: FieldValue.increment(-ticket.costoHuellitas)
      });
      throw new Error("Este ticket expiró.");
    }

    const saldo = saldoVigente(lotes);
    if (saldo < ticket.costoHuellitas) {
      throw new Error(
        `Saldo insuficiente: hay ${saldo} y el ticket cuesta ${ticket.costoHuellitas}.`
      );
    }

    const plan = planConsumoFIFO(lotes, ticket.costoHuellitas);
    const saldoFinal = Math.max(
      0,
      leerHuellitasActuales(cliente) - ticket.costoHuellitas
    );

    // ── Fase 2: escrituras legacy (descuenta huellitas + marca entregado) ──
    for (const c of plan) {
      const loteRef = cols
        .huellitas(db, localId, ticket.clienteId)
        .doc(c.loteId);
      tx.update(loteRef, {
        huellitasRestantes: FieldValue.increment(-c.consumidas)
      });
    }

    const canjeAudRef = cols.canjes(db, localId).doc();
    tx.set(canjeAudRef, {
      localId,
      clienteId: ticket.clienteId,
      ticketId: codigo,
      premioId: ticket.premioId,
      premioNombre: ticket.premioNombre,
      huellitasCanjeadas: ticket.costoHuellitas,
      valorDescuento: ticket.valorDescuento ?? null,
      valor_descuento: ticket.valorDescuento ?? null,
      plan,
      fecha: FieldValue.serverTimestamp(),
      confirmadoPor: adminUid,
      estado: "completado" as EstadoCanje
    });

    tx.update(ticketLegacyRef, {
      estado: "completado" as EstadoCanje,
      confirmadoEn: new Date().toISOString(),
      confirmadoPor: adminUid
    });

    tx.update(clienteRef, {
      ...patchSoloHuellitasActuales(saldoFinal),
      huellitasReservadas: FieldValue.increment(-ticket.costoHuellitas)
    });

    const stockRestante = aplicarDescuentoStockPremio(tx, premioRef, premioSnap);

    registrarLogCanjeEnTx(db, tx, localId, {
      localId,
      clienteId: ticket.clienteId,
      clienteNombre: ticket.clienteNombre,
      premioId: ticket.premioId,
      premioNombre: ticket.premioNombre,
      huellitasDescontadas: ticket.costoHuellitas,
      stockRestante,
      origen: "confirmacion",
      canjeId: canjeAudRef.id,
      adminUid
    });

    return {
      ok: true as const,
      canjeId: canjeAudRef.id,
      clienteId: ticket.clienteId,
      premioNombre: ticket.premioNombre,
      huellitasDescontadas: ticket.costoHuellitas,
      saldoFinal
    };
  });
}

/** Solo escrituras: baja stock del premio si corresponde (datos ya leídos). */
function aplicarDescuentoStockPremio(
  tx: Transaction,
  premioRef: DocumentReference,
  premioSnap: DocumentSnapshot
): number | null {
  if (!premioSnap.exists) return null;
  const stock = (premioSnap.data() as Premio).stock;
  if (typeof stock === "number" && stock > 0) {
    tx.update(premioRef, { stock: FieldValue.increment(-1) });
    return stock - 1;
  }
  if (typeof stock === "number") return stock;
  return null;
}

/** Solo escrituras: devuelve huellitas al expirar (cliente ya leído en la misma transacción). */
function escribirExpiracionCanjeCola(
  db: Firestore,
  tx: Transaction,
  localId: string,
  clienteId: string,
  canjeRef: DocumentReference,
  ticket: Record<string, unknown>,
  cliente: Cliente
): void {
  const plan = ticket.plan as ConsumoLote[];
  const clienteRef = cols.cliente(db, localId, clienteId);
  const costo = Number(ticket.costoHuellitas);

  for (const c of plan) {
    const loteRef = cols.huellitas(db, localId, clienteId).doc(c.loteId);
    tx.update(loteRef, {
      huellitasRestantes: FieldValue.increment(c.consumidas)
    });
  }
  tx.update(clienteRef, {
    saldoHuellitas: Math.max(0, leerHuellitasActuales(cliente) + costo)
  });
  tx.update(canjeRef, {
    estado: "expirado" as EstadoCanje,
    confirmadoEn: new Date().toISOString()
  });
}
