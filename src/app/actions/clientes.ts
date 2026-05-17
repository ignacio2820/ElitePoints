"use server";

import { requireAdmin } from "@/lib/auth/server";
import { emailExisteEnLocal } from "@/lib/auth/persistenciaCliente";
import { normalizarEmailCliente } from "@/lib/huellitas/emailCliente.constants";

/**
 * Devuelve true si el email ya está registrado en Locales/{localId}/Clientes.
 */
export async function verificarEmailDuplicado(
  email: string,
  localId: string
): Promise<boolean> {
  const cleanEmail = normalizarEmailCliente(email);
  if (!cleanEmail || !cleanEmail.includes("@") || !localId.trim()) {
    return false;
  }
  return emailExisteEnLocal(localId, cleanEmail);
}

/**
 * Igual que verificarEmailDuplicado pero usa el localId de la sesión admin.
 */
export async function verificarEmailDuplicadoAdmin(email: string): Promise<boolean> {
  const sesion = await requireAdmin();
  return verificarEmailDuplicado(email, sesion.claims.localId);
}
