/**
 * Orígenes permitidos para magic links y APIs sensibles de auth.
 * En producción: definí AUTH_ALLOWED_ORIGINS (coma-separado) y NEXT_PUBLIC_APP_URL.
 */
function normalizeOrigin(url: string): string {
  try {
    const u = new URL(url.trim());
    return `${u.protocol}//${u.host}`;
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

export function getAllowedAuthOrigins(): string[] {
  const fromEnv = process.env.AUTH_ALLOWED_ORIGINS?.trim();
  const list = fromEnv
    ? fromEnv.split(",").map((s) => normalizeOrigin(s))
    : [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) list.push(normalizeOrigin(appUrl));

  if (process.env.NODE_ENV !== "production") {
    list.push("http://localhost:3000", "http://127.0.0.1:3000");
  }

  return [...new Set(list.filter(Boolean))];
}

export function isProductionAuth(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Rechaza requests de auth desde orígenes no listados (producción). */
export function assertAllowedAuthRequest(req: Request): void {
  if (!isProductionAuth()) return;

  const allowed = getAllowedAuthOrigins();
  if (allowed.length === 0) {
    throw new Error(
      "AUTH_ALLOWED_ORIGINS o NEXT_PUBLIC_APP_URL deben estar configurados en producción."
    );
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  if (origin) {
    if (!allowed.includes(normalizeOrigin(origin))) {
      throw new Error("Origen no autorizado para solicitudes de acceso.");
    }
    return;
  }

  if (referer) {
    try {
      const refOrigin = normalizeOrigin(new URL(referer).origin);
      if (!allowed.includes(refOrigin)) {
        throw new Error("Referer no autorizado para solicitudes de acceso.");
      }
      return;
    } catch {
      throw new Error("Referer inválido.");
    }
  }

  throw new Error(
    "Falta el encabezado Origin. Abrí el login desde el dominio oficial de MascotPoints."
  );
}

/** Solo en desarrollo local se puede exponer el magic link en la respuesta JSON. */
export function mayExposeDevMagicLink(): boolean {
  return process.env.NODE_ENV === "development";
}
