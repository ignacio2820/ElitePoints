/** Email de contacto y soporte visible en toda la app. */
export const CONTACT_EMAIL = 'contacto@webelitesolution.io';

/**
 * Remitente transaccional Resend (string literal limpio, sin comillas escapadas).
 * Debe coincidir con un dominio verificado en Resend.
 */
export const CONTACT_FROM = 'MascotPoints <contacto@webelitesolution.io>';

export function mailtoContact(subject?: string): string {
  const base = `mailto:${CONTACT_EMAIL}`;
  if (!subject) return base;
  return `${base}?subject=${encodeURIComponent(subject)}`;
}
