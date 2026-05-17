import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import {
  buscarClientePorEmail,
  buscarClientePorEmailGlobal,
  getCliente,
  vincularUsuarioACliente,
  type ClienteResumen
} from "@/lib/huellitas/clientesService";
import type { Cliente } from "@/lib/huellitas/types";
import {
  buscarCustomerPorEmail,
  upsertCustomerIndex
} from "@/lib/auth/identityIndex";
import { setCustomClaims } from "@/lib/auth/server";
import { reasignarPasskeysAlUid } from "@/lib/auth/passkeys";
import {
  CODIGO_ERROR_EMAIL_DUPLICADO,
  MENSAJE_EMAIL_DUPLICADO_ADMIN,
  MENSAJE_EMAIL_DUPLICADO_EN_LOCAL,
  normalizarEmailCliente
} from "@/lib/huellitas/emailCliente.constants";

export {
  CODIGO_ERROR_EMAIL_DUPLICADO,
  MENSAJE_EMAIL_DUPLICADO_ADMIN,
  MENSAJE_EMAIL_DUPLICADO_EN_LOCAL
};

export function normalizarEmail(email: string): string {
  return normalizarEmailCliente(email);
}

export { normalizarEmailCliente };

function aResumenDesdeDoc(
  localId: string,
  docId: string,
  data: Partial<Cliente> & { uid?: string },
  email: string
): ClienteResumen {
  return {
    id: docId,
    localId,
    nombre: data.nombre ?? "—",
    email,
    telefono: (data.telefono as string) ?? "",
    saldoHuellitas:
      data.huellitasActuales ?? data.saldoHuellitas ?? 0,
    acumuladoHistorico:
      data.huellitasHistoricas ?? data.acumuladoHistorico ?? 0,
    huellitasActuales:
      data.huellitasActuales ?? data.saldoHuellitas ?? 0,
    huellitasHistoricas:
      data.huellitasHistoricas ?? data.acumuladoHistorico ?? 0,
    nivelId: data.nivelId ?? "cachorro",
    codigoCliente: data.codigoCliente,
    uid: data.uid
  };
}

async function buscarEnLocalesPorEmail(
  e: string,
  soloLocalId?: string
): Promise<ClienteResumen | null> {
  const db = adminDb();
  try {
    const locales = await db.collection("Locales").select().limit(150).get();
    for (const loc of locales.docs) {
      if (soloLocalId && loc.id !== soloLocalId) continue;
      const snap = await cols.clientes(db, loc.id).where("email", "==", e).limit(1).get();
      if (snap.empty) continue;
      const d = snap.docs[0];
      return aResumenDesdeDoc(loc.id, d.id, d.data() as Partial<Cliente>, e);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Busca un cliente por email (índice customers → local preferido → collection group → scan locales).
 */
export async function buscarClientePorEmailRobusto(
  email: string,
  localIdPreferido?: string
): Promise<ClienteResumen | null> {
  const e = normalizarEmail(email);
  if (!e) return null;

  const desdeIndice = await buscarCustomerPorEmail(e);
  if (desdeIndice?.localId && desdeIndice.clienteId) {
    const hit = await getCliente(desdeIndice.localId, desdeIndice.clienteId);
    if (hit) return hit;
  }

  if (localIdPreferido) {
    const enLocal = await buscarClientePorEmail(localIdPreferido, e);
    if (enLocal) return enLocal;
  }

  const global = await buscarClientePorEmailGlobal(e);
  if (global) return global;

  if (localIdPreferido) {
    return buscarEnLocalesPorEmail(e, localIdPreferido);
  }

  return buscarEnLocalesPorEmail(e);
}

export type SesionClienteSincronizada = {
  localId: string;
  clienteId: string;
  nombre: string;
};

/**
 * Enlaza el UID de Auth al cliente Firestore existente. No crea clientes nuevos.
 */
export async function sincronizarSesionClientePorEmail(
  uid: string,
  email: string,
  localIdPreferido?: string
): Promise<SesionClienteSincronizada | null> {
  const e = normalizarEmail(email);
  const cliente = await buscarClientePorEmailRobusto(e, localIdPreferido);
  if (!cliente) return null;

  await setCustomClaims(uid, {
    role: "cliente",
    localId: cliente.localId,
    clienteId: cliente.id
  });
  await vincularUsuarioACliente(cliente.localId, cliente.id, uid);
  await upsertCustomerIndex({
    email: e,
    localId: cliente.localId,
    clienteId: cliente.id,
    uid
  });
  await reasignarPasskeysAlUid(e, uid, {
    localId: cliente.localId,
    clienteId: cliente.id
  });

  return {
    localId: cliente.localId,
    clienteId: cliente.id,
    nombre: cliente.nombre
  };
}

export async function emailYaRegistradoComoCliente(
  email: string,
  localIdPreferido?: string
): Promise<boolean> {
  return (await buscarClientePorEmailRobusto(email, localIdPreferido)) !== null;
}

export class EmailDuplicadoEnLocalError extends Error {
  readonly code = CODIGO_ERROR_EMAIL_DUPLICADO;

  constructor(
    public readonly localId: string,
    public readonly email: string,
    message = MENSAJE_EMAIL_DUPLICADO_EN_LOCAL
  ) {
    super(message);
    this.name = "EmailDuplicadoEnLocalError";
  }
}

export function esEmailDuplicadoEnLocal(
  err: unknown
): err is EmailDuplicadoEnLocalError {
  return err instanceof EmailDuplicadoEnLocalError;
}

/**
 * Consulta directa en Locales/{localId}/Clientes (Admin SDK).
 * Es la fuente de verdad para duplicados dentro del mismo local.
 */
export async function emailExisteEnLocal(
  localId: string,
  email: string
): Promise<boolean> {
  const e = normalizarEmail(email);
  if (!e || !localId.trim()) return false;

  const db = adminDb();
  const snapshot = await cols
    .clientes(db, localId)
    .where("email", "==", e)
    .limit(1)
    .get();

  return !snapshot.empty;
}

/**
 * Bloqueo obligatorio antes de cualquier `set`/`add` en Clientes del local.
 * Lanza EmailDuplicadoEnLocalError si el correo ya está en uso.
 */
export async function validarEmailAntesDeCrearCliente(input: {
  localId: string;
  email: string;
}): Promise<void> {
  const e = normalizarEmail(input.email);
  if (!e) return;

  if (await emailExisteEnLocal(input.localId, e)) {
    throw new EmailDuplicadoEnLocalError(input.localId, e);
  }
}

export function respuestaApiEmailDuplicado() {
  return {
    ok: false as const,
    error: CODIGO_ERROR_EMAIL_DUPLICADO,
    message: MENSAJE_EMAIL_DUPLICADO_EN_LOCAL
  };
}
