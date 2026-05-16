import { PREFIJO_CLIENTE } from "@/lib/qr/scannerPayloads";

/**
 * Extrae el ID de cliente Firestore desde el texto del QR.
 *
 * Formato preferido en pantalla: `MP-CLIENTE:{clienteId}` (baja densidad).
 * Compatibilidad: `/admin/scan/{id}`, URLs y ID plano (QR impresos antiguos).
 */

export function extraerClienteIdDesdeQr(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  const prefijo = t.match(/^MP-CLIENTE:([A-Za-z0-9_-]+)/i);
  if (prefijo?.[1]) return prefijo[1].trim();

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
