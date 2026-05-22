import { PREFIJO_CLIENTE } from "@/lib/qr/scannerPayloads";

/**
 * Extrae el ID de cliente Firestore desde el texto del QR.
 *
 * Formato preferido en pantalla: ID Firestore plano (baja densidad).
 * Compatibilidad: `MP-CLIENTE:{clienteId}` en credenciales antiguas.
 * Compatibilidad: `/admin/scan/{id}`, URLs y ID plano (QR impresos antiguos).
 */

export function extraerClienteIdDesdeQr(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  const prefijoQr = t.match(/^MP-CLIENTE:([A-Za-z0-9_-]+)/i);
  if (prefijoQr?.[1]) return prefijoQr[1].trim();

  const prefijoBarras = t.match(/^MP-CLIENTE-([A-Za-z0-9_-]+)/i);
  if (prefijoBarras?.[1]) return prefijoBarras[1].trim();

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
  // DNI / teléfono (legacy) o sufijo de 8 chars del barcode: los resuelve lookup en caja.
  if (/^\d{7,15}$/.test(simple)) return null;
  if (simple.length === 8) return null;
  if (/^[A-Za-z0-9_-]{9,128}$/.test(simple)) return simple;

  return null;
}
