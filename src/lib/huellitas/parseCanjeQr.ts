import { PREFIJO_CANJE } from "@/lib/qr/scannerPayloads";

/** Extrae el código de canje desde el texto leído por un escáner. */
export function extraerCodigoCanjeDesdeQr(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  const upper = t.toUpperCase();
  if (upper.startsWith(PREFIJO_CANJE)) {
    const codigo = t.slice(PREFIJO_CANJE.length).trim().toUpperCase();
    if (/^[A-Z0-9-]{4,20}$/.test(codigo)) return codigo;
  }

  if (/^[A-Z0-9]{4,12}$/.test(upper.replace(/\s/g, ""))) {
    return upper.replace(/\s/g, "");
  }

  return null;
}
