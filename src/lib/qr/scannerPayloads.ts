/**
 * Payloads cortos para QR en pantalla (lectores físicos de mano).
 * Evita URLs largas que generan matrices densas e ilegibles en displays.
 */

export const PREFIJO_CLIENTE = "MP-CLIENTE:";
/** Variante sin `:` para Code 39 (lectores láser Megawin). */
export const PREFIJO_CLIENTE_BARRAS = "MP-CLIENTE-";
export const PREFIJO_CANJE = "MP-CANJE:";

/** QR de identificación del cliente en caja (ID Firestore plano, baja densidad). */
export function payloadQrCliente(clienteId: string): string {
  const id = clienteId.trim();
  if (!id) throw new Error("clienteId vacío");
  return id;
}

/**
 * @deprecated Barras impresas antiguas con prefijo. La credencial usa los últimos 8 del ID.
 * Se mantiene el prefijo en `parseClienteQr` por compatibilidad.
 */
export function payloadCodigoBarrasCliente(clienteId: string): string {
  const id = clienteId.trim();
  if (!id) throw new Error("clienteId vacío");
  return `${PREFIJO_CLIENTE_BARRAS}${id}`;
}

/** QR de cupón de canje (código alfanumérico corto). */
export function payloadQrCanje(codigo: string): string {
  const c = codigo.trim().toUpperCase();
  if (!c) throw new Error("código de canje vacío");
  return `${PREFIJO_CANJE}${c}`;
}
