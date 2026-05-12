export const LOCAL_DEMO_ID = "demo";

export function rutaBase(pathname: string): string {
  return pathname.split("?")[0];
}

/** Rutas del portal cliente autenticado (sin exponer el tenant en la URL). */
export function rutaCliente(pathname: string): string {
  return rutaBase(pathname);
}

export function rutaConLocalId(pathname: string, localId: string): string {
  const path = rutaBase(pathname);
  const params = new URLSearchParams(pathname.includes("?") ? pathname.split("?")[1] : "");
  params.set("localId", localId);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function loginClienteRedirect(destino: string, localId?: string): string {
  const path = rutaBase(destino);
  const esPortalCliente = path === "/mi-cuenta" || path.startsWith("/mi-cuenta/");
  const redirectTarget = esPortalCliente
    ? rutaCliente(destino)
    : localId
      ? rutaConLocalId(destino, localId)
      : destino;
  const params = new URLSearchParams({ redirect: redirectTarget });
  if (localId && !esPortalCliente) {
    params.set("localId", localId);
  }
  return `/login?${params.toString()}`;
}

export function asegurarLocalIdEnRuta(
  pathname: string,
  localIdSesion: string,
  localIdQuery?: string | null
): string {
  const base = rutaBase(pathname);
  const query = localIdQuery?.trim();
  if (query && query !== localIdSesion) {
    return loginClienteRedirect(base, localIdSesion);
  }
  return rutaCliente(base);
}
