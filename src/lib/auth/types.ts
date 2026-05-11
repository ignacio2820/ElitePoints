/**
 * Tipos canónicos del sistema de autenticación + RBAC.
 *
 * Custom Claims que viajan en el ID token de Firebase Auth:
 *   - role: "admin" (dueño del local) | "cliente"
 *   - localId: string  (el local al que pertenece el usuario)
 *   - clienteId: string (sólo para role=cliente — link al doc Cliente)
 *
 * Se setean desde el Admin SDK (server-side) — nunca el cliente.
 */

export type Rol = "admin" | "cliente";

export interface ClaimsHuellitas {
  role: Rol;
  localId: string;
  clienteId?: string;
}

export interface SesionInfo {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  claims: ClaimsHuellitas;
}

export const COOKIE_SESION = "huellitas_session";

/** 14 días en ms — duración máxima de la session cookie de Firebase. */
export const DURACION_SESION_MS = 60 * 60 * 24 * 14 * 1000;

export function esRolValido(r: unknown): r is Rol {
  return r === "admin" || r === "cliente";
}
