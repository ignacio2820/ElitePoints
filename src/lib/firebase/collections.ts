import type { Firestore } from "firebase-admin/firestore";

/**
 * Helpers tipados para acceder al árbol Firestore multi-tenant.
 *   /Locales/{localId}
 *     /ConfiguracionLocal/main
 *     /Clientes/{clienteId}
 *       /Mascotas/{mascotaId}
 *       /Huellitas/{loteId}
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

  mascotas: (db: Firestore, localId: string, clienteId: string) =>
    db.collection(`Locales/${localId}/Clientes/${clienteId}/Mascotas`),

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

  /** Índice código → clienteId. El doc ID ES el código (uppercase). */
  referidos: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/Referidos`),

  referido: (db: Firestore, localId: string, codigo: string) =>
    db.doc(`Locales/${localId}/Referidos/${codigo}`),

  /** Auditoría de activaciones de bonus (idempotencia + email enviado). */
  eventosReferido: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/EventosReferido`),

  /** Tickets de canje pendiente — el cliente reserva, el admin confirma. */
  canjesPendientes: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/CanjesPendientes`),

  canjePendiente: (db: Firestore, localId: string, canjeId: string) =>
    db.doc(`Locales/${localId}/CanjesPendientes/${canjeId}`),

  /**
   * Índice del código corto del cliente (humanamente memorizable, ej "ABC-123").
   * El doc ID es el código sin guión (ABC123). Garantiza unicidad por path.
   */
  codigosClientes: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/CodigosClientes`),

  codigoCliente: (db: Firestore, localId: string, codigoDocId: string) =>
    db.doc(`Locales/${localId}/CodigosClientes/${codigoDocId}`),

  /** Auditoría de canjes completados (app, manual, confirmación en caja). */
  logsCanjes: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/logs_canjes`),

  /** Alertas en tiempo casi-real para el dashboard del dueño. */
  notificacionesCanjes: (db: Firestore, localId: string) =>
    db.collection(`Locales/${localId}/NotificacionesCanje`)
};
