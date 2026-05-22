import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import {
  esCodigoClienteValido,
  normalizarCodigoCliente
} from "./codigosClientes";
import {
  clienteCoincideClaveBarras,
  esEntradaIdentificadorBarras,
  esSufijoIdFirebaseBarras,
  normalizarClaveBarras,
  pareceIdDocumentoFirestore
} from "./identificadorBarras";
import { extraerClienteIdDesdeQr } from "./parseClienteQr";
import { buscarClientePorCodigoCorto } from "./codigosClientesService";
import {
  leerHuellitasActuales,
  leerHuellitasHistoricas
} from "@/lib/huellitas/saldosCliente";
import type { Cliente } from "./types";

/**
 * Servicios server-side para la colección de clientes.
 * Centraliza búsquedas y vinculaciones con cuentas de Firebase Auth.
 */

export interface ClienteResumen {
  id: string;
  localId: string;
  nombre: string;
  email: string;
  telefono: string;
  saldoHuellitas: number;
  acumuladoHistorico: number;
  huellitasActuales: number;
  huellitasHistoricas: number;
  nivelId: string;
  /** Código corto humano-amigable (ej "ABC-123") para identificación en caja. */
  codigoCliente?: string;
  uid?: string; // UID de Firebase Auth si está vinculado
}

function aResumen(id: string, data: Partial<Cliente> & { uid?: string }, localId: string): ClienteResumen {
  return {
    id,
    localId,
    nombre: data.nombre ?? "—",
    email: (data.email as string) ?? "",
    telefono: (data.telefono as string) ?? "",
    saldoHuellitas: leerHuellitasActuales(data),
    acumuladoHistorico: leerHuellitasHistoricas(data),
    huellitasActuales: leerHuellitasActuales(data),
    huellitasHistoricas: leerHuellitasHistoricas(data),
    nivelId: data.nivelId ?? "cachorro",
    codigoCliente: data.codigoCliente,
    uid: data.uid
  };
}

/** Busca un cliente por email exacto (case-insensitive). Devuelve null si no existe. */
export async function buscarClientePorEmail(
  localId: string,
  email: string
): Promise<ClienteResumen | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  const db = adminDb();
  const snap = await cols.clientes(db, localId).where("email", "==", e).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return aResumen(d.id, d.data() as Partial<Cliente>, localId);
}

/**
 * Busca el primer cliente con el email dado.
 *
 * Usa una collection group query sobre la subcolección Clientes de cada local.
 * Requiere índice custom en Firestore (la consola lo ofrece al primer uso).
 *
 * Si la query falla (índice ausente), devolvemos null en silencio.
 */
export async function buscarClientePorEmailGlobal(
  email: string
): Promise<ClienteResumen | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;

  try {
    const db = adminDb();
    const snap = await db
      .collectionGroup("Clientes")
      .where("email", "==", e)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data = d.data() as Partial<Cliente> & { localId?: string };
    const localId = data.localId ?? d.ref.parent.parent?.id ?? "";
    return aResumen(d.id, data, localId);
  } catch {
    // Sin índice de collection group → asumimos que no hay match en otros locales.
    // Esto es seguro para single-tenant; para multi-tenant, crear el índice.
    return null;
  }
}

/**
 * Lista clientes con filtro opcional por texto:
 *  - Si la query parece un código corto (ej "ABC-123"), prioriza el match
 *    exacto vía el índice CodigosClientes (instantáneo).
 *  - Si no, hace prefix por nombre y filtra en memoria por
 *    nombre/email/teléfono/ID.
 */
export async function listarClientes(
  localId: string,
  query?: string,
  limit = 100
): Promise<ClienteResumen[]> {
  const db = adminDb();
  const qRaw = (query ?? "").trim();

  // Match rápido por código corto: si la query normaliza a un código
  // válido, devolvemos directamente ese cliente (1 doc) — no recorremos
  // toda la colección. Caja registradora es el caso de uso principal.
  if (esCodigoClienteValido(qRaw)) {
    const hit = await buscarClientePorCodigoCorto(localId, qRaw);
    if (hit) {
      const cliente = await getCliente(localId, hit.clienteId);
      if (cliente) return [cliente];
    }
    // Si parecía código pero no existe, devolvemos vacío inmediatamente.
    return [];
  }

  const porEscanner = await resolverClienteDesdeEscanner(localId, qRaw);
  if (porEscanner) return [porEscanner];

  const q = qRaw.toLowerCase();
  let snap;
  try {
    snap = await cols.clientes(db, localId).orderBy("nombre").limit(limit).get();
  } catch {
    snap = await cols.clientes(db, localId).limit(limit).get();
  }

  const todos = snap.docs
    .map((d) => aResumen(d.id, d.data() as Partial<Cliente>, localId))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  if (!q) return todos;

  const claveBarras = normalizarClaveBarras(qRaw);
  return todos.filter((c) => {
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.telefono.includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.codigoCliente ?? "").toLowerCase().includes(q) ||
      (claveBarras !== "" &&
        clienteCoincideClaveBarras(
          { telefono: c.telefono, claveBarras: undefined },
          claveBarras
        ))
    );
  });
}

/**
 * Resuelve un código corto (ej "ABC-123") al cliente correspondiente.
 * Si la entrada NO es un código válido, devuelve null sin tocar Firestore.
 * Tolera mayúsculas/minúsculas, espacios y caracteres confusos (O→0, I→1...).
 */
export async function lookupPorCodigoCorto(
  localId: string,
  codigoInput: string
): Promise<ClienteResumen | null> {
  if (!esCodigoClienteValido(codigoInput)) return null;
  const _normalizado = normalizarCodigoCliente(codigoInput);
  void _normalizado; // sólo para validar formato; el helper hace su propia normalización
  const hit = await buscarClientePorCodigoCorto(localId, codigoInput);
  if (!hit) return null;
  return getCliente(localId, hit.clienteId);
}

/**
 * Resuelve el sufijo de 8 caracteres del doc-id (código de barras en credencial).
 */
export async function lookupPorSufijoIdBarras(
  localId: string,
  entrada: string
): Promise<ClienteResumen | null> {
  const sufijo = entrada.trim();
  if (!esSufijoIdFirebaseBarras(sufijo)) return null;

  const db = adminDb();
  try {
    const porIndice = await cols
      .clientes(db, localId)
      .where("sufijoIdBarras", "==", sufijo)
      .limit(2)
      .get();
    if (!porIndice.empty) {
      const d = porIndice.docs[0];
      return aResumen(d.id, d.data() as Partial<Cliente>, localId);
    }
  } catch {
    // Sin índice → fallback por sufijo en id del documento.
  }

  const snap = await cols.clientes(db, localId).limit(500).get();
  const matches = snap.docs.filter((d) => d.id.endsWith(sufijo));
  if (matches.length !== 1) return null;
  const d = matches[0];
  return aResumen(d.id, d.data() as Partial<Cliente>, localId);
}

/**
 * QR (ID completo), barras (sufijo 8) o DNI/teléfono legacy desde el escáner de caja.
 */
export async function resolverClienteDesdeEscanner(
  localId: string,
  entrada: string
): Promise<ClienteResumen | null> {
  const q = entrada.trim();
  if (!q) return null;

  const idQr = extraerClienteIdDesdeQr(q);
  if (idQr) {
    const hit = await getCliente(localId, idQr);
    if (hit) return hit;
  }

  if (pareceIdDocumentoFirestore(q)) {
    const hit = await getCliente(localId, q);
    if (hit) return hit;
  }

  if (esSufijoIdFirebaseBarras(q)) {
    const hit = await lookupPorSufijoIdBarras(localId, q);
    if (hit) return hit;
  }

  if (esEntradaIdentificadorBarras(q)) {
    return lookupPorIdentificadorBarras(localId, q);
  }

  return null;
}

/**
 * Resuelve DNI o teléfono leído por el escáner (CODE128 numérico en credencial legacy).
 */
export async function lookupPorIdentificadorBarras(
  localId: string,
  entrada: string
): Promise<ClienteResumen | null> {
  const clave = normalizarClaveBarras(entrada);
  if (!clave) return null;

  const db = adminDb();
  const porIndice = await cols
    .clientes(db, localId)
    .where("claveBarras", "==", clave)
    .limit(1)
    .get();
  if (!porIndice.empty) {
    const d = porIndice.docs[0];
    return aResumen(d.id, d.data() as Partial<Cliente>, localId);
  }

  const snap = await cols.clientes(db, localId).limit(500).get();
  for (const doc of snap.docs) {
    const data = doc.data() as Partial<Cliente>;
    if (clienteCoincideClaveBarras(data, clave)) {
      return aResumen(doc.id, data, localId);
    }
  }
  return null;
}

export async function getCliente(
  localId: string,
  clienteId: string
): Promise<ClienteResumen | null> {
  const db = adminDb();
  const snap = await cols.cliente(db, localId, clienteId).get();
  if (!snap.exists) return null;
  return aResumen(snap.id, snap.data() as Partial<Cliente>, localId);
}

/** Asocia un UID de Firebase Auth a un cliente Firestore. Idempotente. */
export async function vincularUsuarioACliente(
  localId: string,
  clienteId: string,
  uid: string
): Promise<void> {
  const db = adminDb();
  await cols.cliente(db, localId, clienteId).set({ uid }, { merge: true });
}
