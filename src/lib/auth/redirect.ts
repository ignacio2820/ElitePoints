import type { Rol } from "./types";

function esRutaInternaSegura(path: string): boolean {
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("://") &&
    !path.includes("\\")
  );
}

/** Destino post-login validado según el rol y el redirect opcional del magic link. */
export function destinoPostLogin(rol: Rol, redirect?: string | null): string {
  const solicitado = redirect?.trim();
  if (rol === "admin") {
    if (solicitado && esRutaInternaSegura(solicitado) && solicitado.startsWith("/admin")) {
      return solicitado;
    }
    return "/admin";
  }
  if (
    solicitado &&
    esRutaInternaSegura(solicitado) &&
    (solicitado.startsWith("/mi-cuenta") || solicitado.startsWith("/cliente"))
  ) {
    return solicitado;
  }
  return "/mi-cuenta";
}
