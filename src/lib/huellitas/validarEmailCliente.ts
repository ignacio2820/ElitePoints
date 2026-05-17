import { emailYaRegistradoComoCliente } from "@/lib/auth/persistenciaCliente";

export const ERROR_EMAIL_CLIENTE_DUPLICADO =
  "Error: Este correo electrónico ya está registrado. Utilice otro o recupere la cuenta existente.";

export class EmailClienteDuplicadoError extends Error {
  constructor(message = ERROR_EMAIL_CLIENTE_DUPLICADO) {
    super(message);
    this.name = "EmailClienteDuplicadoError";
  }
}

/** Normaliza correos antes de guardar o comparar. */
export function normalizarEmailCliente(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Lanza si el email ya pertenece a un cliente en cualquier local.
 * Los correos vacíos se ignoran (alta sin email sigue permitida).
 */
export async function assertEmailClienteDisponible(
  email: string,
  localIdPreferido?: string
): Promise<void> {
  const e = normalizarEmailCliente(email);
  if (!e) return;

  const existe = await emailYaRegistradoComoCliente(e, localIdPreferido);
  if (existe) {
    throw new EmailClienteDuplicadoError();
  }
}

export async function emailClienteDisponible(
  email: string,
  localIdPreferido?: string
): Promise<boolean> {
  const e = normalizarEmailCliente(email);
  if (!e) return true;
  return !(await emailYaRegistradoComoCliente(e, localIdPreferido));
}
