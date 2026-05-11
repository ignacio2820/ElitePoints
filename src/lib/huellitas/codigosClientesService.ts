import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import {
  aDocId,
  aFormatoVisual,
  esCodigoClienteValido,
  generarCodigoCliente,
  normalizarCodigoCliente
} from "./codigosClientes";

/**
 * Servicio server-side: gestiona el índice /Locales/{localId}/CodigosClientes.
 *
 * Cada doc:
 *   id: codigoSinGuion ("ABC123")
 *   data: { codigo: "ABC-123", clienteId: "...", creadoEn: ISO }
 *
 * El doc-id garantiza unicidad por su propio path: dos clientes no pueden
 * tener el mismo código dentro de un local.
 */

const MAX_INTENTOS = 12;

interface CodigoIndexDoc {
  codigo: string;
  clienteId: string;
  creadoEn: string;
}

/**
 * Asigna un código corto único a un cliente. Si choca, reintenta.
 * Devuelve el código en formato visual ("ABC-123").
 */
export async function asegurarCodigoClienteUnico(
  localId: string,
  clienteId: string
): Promise<string> {
  const db = adminDb();

  for (let i = 0; i < MAX_INTENTOS; i++) {
    const codigoVisual = generarCodigoCliente();
    const docId = aDocId(codigoVisual);
    const ref = cols.codigoCliente(db, localId, docId);

    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists) throw new Error("colision");
        const payload: CodigoIndexDoc = {
          codigo: codigoVisual,
          clienteId,
          creadoEn: new Date().toISOString()
        };
        tx.set(ref, payload);
      });
      return codigoVisual;
    } catch (e) {
      if (!(e instanceof Error) || e.message !== "colision") throw e;
    }
  }
  throw new Error(
    "No se pudo generar un código único después de varios intentos"
  );
}

/**
 * Lookup directo: del código (en cualquier formato) al clienteId.
 * Devuelve null si no existe o si el código es inválido.
 */
export async function buscarClientePorCodigoCorto(
  localId: string,
  inputCodigo: string
): Promise<{ clienteId: string; codigo: string } | null> {
  if (!esCodigoClienteValido(inputCodigo)) return null;
  const codigoVisual = normalizarCodigoCliente(inputCodigo);
  const docId = aDocId(codigoVisual);
  const db = adminDb();
  const snap = await cols.codigoCliente(db, localId, docId).get();
  if (!snap.exists) return null;
  const data = snap.data() as CodigoIndexDoc;
  return { clienteId: data.clienteId, codigo: aFormatoVisual(data.codigo) };
}
