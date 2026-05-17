import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  normalizarEmail,
  validarEmailAntesDeCrearCliente
} from "@/lib/auth/persistenciaCliente";
import { cols } from "@/lib/firebase/collections";
import {
  esCodigoValido,
  generarCodigoSugerido,
  normalizarCodigo
} from "./referidos";
import { asegurarCodigoClienteUnico } from "./codigosClientesService";
import type { Cliente, ReferidoIndex } from "./types";

/**
 * Servicios server-side del programa de referidos. Garantizan unicidad
 * del código vía el doc-id de /Locales/{localId}/Referidos/{codigo}.
 */

const MAX_INTENTOS_CODIGO = 10;

/**
 * Genera un código único transaccionalmente. Si choca, reintenta.
 * El doc en /Referidos/{codigo} actúa como índice y "candado":
 * dos clientes nunca pueden compartir código.
 */
export async function asegurarCodigoUnico(
  localId: string,
  nombre: string,
  clienteId: string
): Promise<string> {
  const db = adminDb();

  for (let i = 0; i < MAX_INTENTOS_CODIGO; i++) {
    const candidato = generarCodigoSugerido(nombre);
    const ref = cols.referido(db, localId, candidato);

    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists) throw new Error("colision");
        const payload: ReferidoIndex = {
          codigo: candidato,
          clienteId,
          creadoEn: new Date().toISOString()
        };
        tx.set(ref, payload);
      });
      return candidato;
    } catch (e) {
      if (!(e instanceof Error) || e.message !== "colision") throw e;
      // colisión → siguiente intento
    }
  }
  throw new Error(
    "No se pudo generar un código único después de varios intentos"
  );
}

/**
 * Lookup eficiente: del código directo al clienteId.
 * Devuelve null si no existe.
 */
export async function getReferentePorCodigo(
  localId: string,
  codigoRaw: string
): Promise<{ codigo: string; clienteId: string } | null> {
  const codigo = normalizarCodigo(codigoRaw);
  if (!esCodigoValido(codigo)) return null;
  const db = adminDb();
  const snap = await cols.referido(db, localId, codigo).get();
  if (!snap.exists) return null;
  const data = snap.data() as ReferidoIndex;
  return { codigo, clienteId: data.clienteId };
}

/**
 * Crea un cliente con código de referido único. Si `codigoReferenteRaw`
 * existe y es válido, vincula al cliente existente y aumenta su contador
 * `referidosTotales`.
 *
 * IMPORTANTE: la activación del BONUS se hace recién en la primera compra
 * (ver registrarVenta).
 */
export async function crearClienteConReferido(input: {
  localId: string;
  cliente: Pick<Cliente, "nombre" | "email" | "telefono">;
  codigoReferenteRaw?: string;
}): Promise<{
  clienteId: string;
  codigoReferido: string;
  codigoCliente: string;
  referidoPor?: string;
}> {
  const emailNorm = normalizarEmail(input.cliente.email ?? "");
  await validarEmailAntesDeCrearCliente({
    localId: input.localId,
    email: emailNorm
  });

  const db = adminDb();
  const referente = input.codigoReferenteRaw
    ? await getReferentePorCodigo(input.localId, input.codigoReferenteRaw)
    : null;

  // 1. Crear el doc del cliente (sin códigos aún — los asignamos después)
  const clienteRef = cols.clientes(db, input.localId).doc();
  const clienteData: Cliente = {
    localId: input.localId,
    nombre: input.cliente.nombre,
    email: emailNorm,
    telefono: input.cliente.telefono ?? "",
    saldoHuellitas: 0,
    huellitasReservadas: 0,
    acumuladoHistorico: 0,
    nivelId: "cachorro",
    referidoActivado: false,
    referidosActivados: 0,
    referidosTotales: 0,
    primerCompraRegistrada: false,
    mascotas: [],
    creadoEn: new Date().toISOString(),
    // Sólo incluimos referidoPor si efectivamente vino por código —
    // Firestore rechaza valores undefined en escrituras directas.
    ...(referente ? { referidoPor: referente.clienteId } : {})
  };
  await clienteRef.set(clienteData);

  // 2. Asignar código de REFERIDO (programa "boca en boca")
  const codigoReferido = await asegurarCodigoUnico(
    input.localId,
    input.cliente.nombre,
    clienteRef.id
  );

  // 3. Asignar código corto del CLIENTE (identificación rápida en caja)
  const codigoCliente = await asegurarCodigoClienteUnico(
    input.localId,
    clienteRef.id
  );

  await clienteRef.update({ codigoReferido, codigoCliente });

  // 4. Si vino por referido, sumar al contador del referente
  if (referente) {
    await cols
      .cliente(db, input.localId, referente.clienteId)
      .update({
        referidosTotales: FieldValue.increment(1)
      });
  }

  return {
    clienteId: clienteRef.id,
    codigoReferido,
    codigoCliente,
    referidoPor: referente?.clienteId
  };
}

/**
 * Vincula POSTERIORMENTE un cliente existente con un código de referido.
 * Útil si el cliente se registró sin código y después le compartieron uno.
 *
 * Constraints:
 *  - Sólo se puede vincular una vez (idempotente).
 *  - No se puede auto-referir.
 *  - No se puede vincular si ya hizo su primera compra (sería tramposo).
 */
export async function vincularReferidoPosterior(input: {
  localId: string;
  clienteId: string;
  codigoReferenteRaw: string;
}): Promise<{ ok: true; referidoPor: string } | { ok: false; error: string }> {
  const db = adminDb();
  const referente = await getReferentePorCodigo(
    input.localId,
    input.codigoReferenteRaw
  );
  if (!referente) return { ok: false, error: "Código inválido o inexistente" };
  if (referente.clienteId === input.clienteId) {
    return { ok: false, error: "No podés usar tu propio código" };
  }

  return db.runTransaction(async (tx) => {
    const clienteRef = cols.cliente(db, input.localId, input.clienteId);
    const snap = await tx.get(clienteRef);
    if (!snap.exists) return { ok: false, error: "Cliente inexistente" };
    const c = snap.data() as Cliente;
    if (c.referidoPor) return { ok: false, error: "Ya tenés un referente asignado" };
    if (c.primerCompraRegistrada) {
      return { ok: false, error: "Ya hiciste tu primera compra; el código no aplica" };
    }
    tx.update(clienteRef, { referidoPor: referente.clienteId });
    tx.update(cols.cliente(db, input.localId, referente.clienteId), {
      referidosTotales: FieldValue.increment(1)
    });
    return { ok: true as const, referidoPor: referente.clienteId };
  });
}
