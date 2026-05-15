import { adminAuth } from "@/lib/firebase/admin";

const MIN_LENGTH = 8;

export function validarPasswordNueva(password: string): string | null {
  const p = password.trim();
  if (p.length < MIN_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`;
  }
  if (p.length > 128) {
    return "La contraseña es demasiado larga.";
  }
  return null;
}

/** Establece o reemplaza la contraseña del dueño (Firebase Admin). */
export async function establecerPasswordUsuario(
  uid: string,
  password: string
): Promise<void> {
  const err = validarPasswordNueva(password);
  if (err) throw new Error(err);

  await adminAuth().updateUser(uid, { password });
}

export async function usuarioTieneProveedorPassword(
  email: string
): Promise<boolean> {
  try {
    const u = await adminAuth().getUserByEmail(email.trim().toLowerCase());
    return u.providerData.some((p) => p.providerId === "password");
  } catch {
    return false;
  }
}
