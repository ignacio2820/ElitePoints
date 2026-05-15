import type { Rol } from "./types";

export const RUTA_DASHBOARD = "/dashboard";
export const RUTA_PORTAL = "/portal";

function esRutaInternaSegura(path: string): boolean {
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("://") &&
    !path.includes("\\")
  );
}

function esRutaOwner(path: string): boolean {
  return (
    path === RUTA_DASHBOARD ||
    path.startsWith(`${RUTA_DASHBOARD}/`) ||
    path === "/admin" ||
    path.startsWith("/admin/")
  );
}

function esRutaCliente(path: string): boolean {
  return (
    path === RUTA_PORTAL ||
    path.startsWith(`${RUTA_PORTAL}/`) ||
    path === "/mi-cuenta" ||
    path.startsWith("/mi-cuenta/") ||
    path.startsWith("/cliente/")
  );
}

/** Normaliza rutas legacy a las URLs canónicas post-login. */
export function normalizarDestinoCanonico(path: string, rol: Rol): string {
  if (rol === "admin") {
    if (path === "/admin" || path.startsWith("/admin/")) {
      return path.replace(/^\/admin/, RUTA_DASHBOARD);
    }
    return path;
  }
  if (path === "/mi-cuenta" || path.startsWith("/mi-cuenta/")) {
    return path.replace(/^\/mi-cuenta/, RUTA_PORTAL);
  }
  return path;
}

/** Destino post-login validado según el rol y el redirect opcional del magic link. */
export function destinoPostLogin(rol: Rol, redirect?: string | null): string {
  const solicitado = redirect?.trim();
  if (rol === "admin") {
    if (solicitado && esRutaInternaSegura(solicitado) && esRutaOwner(solicitado)) {
      return normalizarDestinoCanonico(solicitado, rol);
    }
    return RUTA_DASHBOARD;
  }
  if (
    solicitado &&
    esRutaInternaSegura(solicitado) &&
    esRutaCliente(solicitado)
  ) {
    return normalizarDestinoCanonico(solicitado, rol);
  }
  return RUTA_PORTAL;
}
