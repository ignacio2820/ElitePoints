import {
  CODIGO_ERROR_EMAIL_DUPLICADO,
  EmailDuplicadoEnLocalError,
  MENSAJE_EMAIL_DUPLICADO_EN_LOCAL,
  emailExisteEnLocal,
  normalizarEmailCliente,
  validarEmailAntesDeCrearCliente
} from "@/lib/auth/persistenciaCliente";

export {
  CODIGO_ERROR_EMAIL_DUPLICADO,
  EmailDuplicadoEnLocalError,
  MENSAJE_EMAIL_DUPLICADO_EN_LOCAL
};

export const ERROR_EMAIL_CLIENTE_DUPLICADO =
  "Error: Este correo electrónico ya está registrado. Utilice otro o recupere la cuenta existente.";

/** @deprecated Usar EmailDuplicadoEnLocalError */
export class EmailClienteDuplicadoError extends EmailDuplicadoEnLocalError {
  constructor(message = ERROR_EMAIL_CLIENTE_DUPLICADO) {
    super("", "", message);
  }
}

export { normalizarEmailCliente };

/**
 * Lanza si el email ya existe en Locales/{localId}/Clientes.
 * Requiere localId (alta siempre es por local).
 */
export async function assertEmailClienteDisponible(
  email: string,
  localId: string
): Promise<void> {
  await validarEmailAntesDeCrearCliente({ localId, email });
}

export async function emailClienteDisponible(
  email: string,
  localId: string
): Promise<boolean> {
  const e = normalizarEmailCliente(email);
  if (!e) return true;
  return !(await emailExisteEnLocal(localId, e));
}
