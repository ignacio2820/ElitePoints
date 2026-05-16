/**
 * Extrae el ID de cliente Firestore desde el texto del QR.
 *
 * El QR oficial de Mi cuenta apunta a `/admin/scan/{clienteId}`.
 * También aceptamos `/cliente/{id}` y un ID plano.
 */

export function extraerClienteIdDesdeQr(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  try {
    const url = /^https?:\/\//i.test(t)
      ? new URL(t)
      : new URL(t.startsWith("/") ? t : `/${t}`, "https://dummy.local");
    const path = url.pathname;

    const scan = path.match(/\/admin\/scan\/([^/?#]+)/i);
    if (scan?.[1]) return decodeURIComponent(scan[1].trim());

    const clientePath = path.match(/\/cliente\/([^/?#]+)/i);
    if (clientePath?.[1]) return decodeURIComponent(clientePath[1].trim());

    const fromQuery =
      url.searchParams.get("cliente") ??
      url.searchParams.get("clienteId") ??
      url.searchParams.get("id");
    if (fromQuery?.trim()) return fromQuery.trim();
  } catch {
    // texto que no es URL
  }

  const simple = t.replace(/\s/g, "");
  if (/^[A-Za-z0-9_-]{8,128}$/.test(simple)) return simple;

  return null;
}
