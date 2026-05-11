export const LOCAL_DEMO_ID = "demo";

export function rutaConLocalId(pathname: string, localId: string): string {
  const [path, query = ""] = pathname.split("?");
  const params = new URLSearchParams(query);
  params.set("localId", localId);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function loginClienteRedirect(destino: string, localId?: string): string {
  const redirect = localId ? rutaConLocalId(destino, localId) : destino;
  const params = new URLSearchParams({ redirect });
  if (localId) {
    params.set("localId", localId);
  }
  return `/login?${params.toString()}`;
}

export function asegurarLocalIdEnRuta(
  pathname: string,
  localIdSesion: string,
  localIdQuery?: string | null
): string {
  const query = localIdQuery?.trim();
  if (!query) {
    return rutaConLocalId(pathname, localIdSesion);
  }
  if (query !== localIdSesion) {
    return loginClienteRedirect(pathname, localIdSesion);
  }
  return rutaConLocalId(pathname, localIdSesion);
}
