import { CONTACT_FROM } from "@/lib/contact";

/**
 * Algunos hosts / dashboards envían RESEND_FROM con comillas literales o
 * doble-envueltas; Resend rechaza el formato. Devuelve siempre un string limpio.
 */
function normalizarResendFrom(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  let s = String(raw).trim();
  if (!s) return undefined;

  // Quita capas externas de " o ' repetidas (p. ej. ""Name <a@b>"" desde env)
  for (let i = 0; i < 8; i++) {
    const antes = s;
    if (s.startsWith('"') && s.endsWith('"')) {
      s = s.slice(1, -1).trim();
    } else if (s.startsWith("'") && s.endsWith("'")) {
      s = s.slice(1, -1).trim();
    }
    if (s === antes) break;
  }

  // Restos de escape típicos al pegar JSON en variables de entorno
  s = s.replace(/^\\"/, "").replace(/\\"$/, "").trim();

  return s || undefined;
}

/** Remitente transaccional con marca ElitePoints. */
export function emailFromAddress(): string {
  return normalizarResendFrom(process.env.RESEND_FROM) ?? CONTACT_FROM;
}
