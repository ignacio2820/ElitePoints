/**
 * Identificador numérico corto para código de barras en credencial y lector láser.
 * Prioridad: DNI → teléfono (últimos 10 dígitos si es largo, p. ej. +54 9 …).
 */

export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Clave canónica indexada en Firestore (`claveBarras`). */
export function normalizarClaveBarras(input: string): string {
  const d = soloDigitos(input);
  if (d.length < 7 || d.length > 15) return "";
  if (d.length > 10) return d.slice(-10);
  return d;
}

export function esEntradaIdentificadorBarras(input: string): boolean {
  return normalizarClaveBarras(input) !== "";
}

/** Valor impreso en CODE128 (preferencia DNI). */
export function valorCodigoBarrasDesdeCliente(cliente: {
  dni?: string;
  telefono?: string;
}): string | null {
  const dni = soloDigitos(cliente.dni ?? "");
  if (dni.length >= 7 && dni.length <= 11) return dni;

  const tel = soloDigitos(cliente.telefono ?? "");
  if (tel.length >= 8) {
    return tel.length > 10 ? tel.slice(-10) : tel;
  }
  return null;
}

/** Campo denormalizado para consulta por igualdad en caja. */
export function claveBarrasDesdeCliente(cliente: {
  dni?: string;
  telefono?: string;
}): string {
  return valorCodigoBarrasDesdeCliente(cliente) ?? "";
}

export function clienteCoincideClaveBarras(
  cliente: { dni?: string; telefono?: string; claveBarras?: string },
  entrada: string
): boolean {
  const clave = normalizarClaveBarras(entrada);
  if (!clave) return false;
  if (cliente.claveBarras === clave) return true;
  return valorCodigoBarrasDesdeCliente(cliente) === clave;
}
