/** Email recordado para acceso rápido en PWA / login de cliente. */
export const STORAGE_ULTIMO_EMAIL = "huellitas:ultimoEmail";

export function leerUltimoEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_ULTIMO_EMAIL)?.trim().toLowerCase() ?? "";
  } catch {
    return "";
  }
}

export function guardarUltimoEmail(email: string): void {
  if (typeof window === "undefined") return;
  const t = email.trim().toLowerCase();
  if (!t) return;
  try {
    localStorage.setItem(STORAGE_ULTIMO_EMAIL, t);
  } catch {
    // ignore quota / private mode
  }
}
