import {
  CODIGO_ERROR_EMAIL_DUPLICADO,
  EmailDuplicadoEnLocalError,
  MENSAJE_EMAIL_DUPLICADO_EN_LOCAL,
  emailExisteEnLocal,
  validarEmailAntesDeCrearCliente
} from "@/lib/auth/persistenciaCliente";
import {
  ERROR_EMAIL_CLIENTE_DUPLICADO,
  normalizarEmailCliente
} from "@/lib/huellitas/emailCliente.constants";

export {
  CODIGO_ERROR_EMAIL_DUPLICADO,
  EmailDuplicadoEnLocalError,
  MENSAJE_EMAIL_DUPLICADO_EN_LOCAL,
  normalizarEmailCliente
};

export { ERROR_EMAIL_CLIENTE_DUPLICADO };

/** @deprecated Usar EmailDuplicadoEnLocalError */
export class EmailClienteDuplicadoError extends EmailDuplicadoEnLocalError {
  constructor(message = ERROR_EMAIL_CLIENTE_DUPLICADO) {
    super("", "", message);
  }
}

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
