import type { Firestore } from "firebase-admin/firestore";

/**
 * Helpers tipados para el árbol Firestore multi-tenant (ElitePoints).
 *   /Locales/{localId}
 *     /ConfiguracionLocal/main
 *     /Clientes/{clienteId}
 *       /Huellitas/{loteId}   ← lotes de puntos (nombre legacy en Firestore)
 *     /Ventas/{ventaId}
 *     /Canjes/{canjeId}
 */
export const cols = {
  local: (db: Firestore, localId: string) => db.doc(`Locales/${localId}`),

  configuracion: (db: Firestore, localId: string) =>
    db.doc(`Locales/${localId}/ConfiguracionLocal/main`),

  clientes: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/Clientes`),

  cliente: (db: Firestore, localId: string, clienteId: string) =>
    db.doc(`Locales/${localId}/Clientes/${clienteId}`),

  /** Lotes FIFO de puntos del cliente (ruta Firestore: `Huellitas`). */
  puntos: (db: Firestore, localId: string, clienteId: string) =>
    db.collection(`Locales/${localId}/Clientes/${clienteId}/Huellitas`),

  /** @deprecated Alias de `puntos` — misma subcolección `Huellitas`. */
  huellitas: (db: Firestore, localId: string, clienteId: string) =>
    db.collection(`Locales/${localId}/Clientes/${clienteId}/Huellitas`),

  ventas: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/Ventas`),

  canjes: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/Canjes`),

  premios: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/Premios`),

  premio: (db: Firestore, localId: string, premioId: string) =>
    db.doc(`Locales/${localId}/Premios/${premioId}`),

  referidos: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/Referidos`),

  referido: (db: Firestore, localId: string, codigo: string) =>
    db.doc(`Locales/${localId}/Referidos/${codigo}`),

  eventosReferido: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/EventosReferido`),

  canjesPendientes: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/CanjesPendientes`),

  canjePendiente: (db: Firestore, localId: string, canjeId: string) =>
    db.doc(`Locales/${localId}/CanjesPendientes/${canjeId}`),

  codigosClientes: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/CodigosClientes`),

  codigoCliente: (db: Firestore, localId: string, codigoDocId: string) =>
    db.doc(`Locales/${localId}/CodigosClientes/${codigoDocId}`),

  logsCanjes: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/logs_canjes`),

  notificacionesCanjes: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/NotificacionesCanje`),

  sorteos: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/Sorteos`),

  sorteo: (db: Firestore, localId: string, sorteoId: string) =>
    db.doc(`Locales/${localId}/Sorteos/${sorteoId}`),

  transaccionesCliente: (db: Firestore, localId: string, clienteId: string) =>
    db.collection(`Locales/${localId}/Clientes/${clienteId}/Transacciones`),

  invitacionesEncuesta: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/InvitacionesEncuesta`),

  invitacionEncuesta: (db: Firestore, localId: string, token: string) =>
    db.doc(`Locales/${localId}/InvitacionesEncuesta/${token}`),

  encuestas: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/Encuestas`),

  encuesta: (db: Firestore, localId: string, encuestaId: string) =>
    db.doc(`Locales/${localId}/Encuestas/${encuestaId}`),

  encuestasSatisfaccion: (db: Firestore) => db.collection("encuestas_satisfaccion")
};
