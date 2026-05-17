/**
 * Constantes y helpers seguros para Client Components.
 * Sin imports de Firebase Admin ni next/headers.
 */

export const CODIGO_ERROR_EMAIL_DUPLICADO = "EMAIL_DUPLICATED" as const;

export const MENSAJE_EMAIL_DUPLICADO_EN_LOCAL =
  "Este correo electrónico ya está registrado en este local.";

export const MENSAJE_EMAIL_DUPLICADO_ADMIN =
  "¡Error! No se puede registrar: el correo electrónico ya pertenece a un cliente activo.";

export const ERROR_EMAIL_CLIENTE_DUPLICADO =
  "Error: Este correo electrónico ya está registrado. Utilice otro o recupere la cuenta existente.";

export function normalizarEmailCliente(email: string): string {
  return email.trim().toLowerCase();
}
