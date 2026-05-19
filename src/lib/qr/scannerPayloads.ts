/**
 * Payloads cortos para QR en pantalla (lectores físicos de mano).
 * Evita URLs largas que generan matrices densas e ilegibles en displays.
 */

export const PREFIJO_CLIENTE = "MP-CLIENTE:";
/** Variante sin `:` para Code 39 (lectores láser Megawin). */
export const PREFIJO_CLIENTE_BARRAS = "MP-CLIENTE-";
export const PREFIJO_CANJE = "MP-CANJE:";

/** QR de identificación del cliente en caja (solo ID Firestore). */
export function payloadQrCliente(clienteId: string): string {
  const id = clienteId.trim();
  if (!id) throw new Error("clienteId vacío");
  return `${PREFIJO_CLIENTE}${id}`;
}

/**
 * @deprecated El barcode en credencial usa DNI/teléfono (`valorCodigoBarrasDesdeCliente`).
 * Se mantiene el prefijo solo para QR/barras impresos antiguos en `parseClienteQr`.
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
