const DEFAULT_APP_URL = "http://localhost:3000";

type HeaderSource = Pick<Headers, "get">;

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function firstHeaderValue(value: string | null): string | undefined {
  const trimmed = value?.split(",")[0]?.trim();
  return trimmed || undefined;
}

function baseUrlFromHeaders(headers: HeaderSource): string | null {
  const proto = firstHeaderValue(headers.get("x-forwarded-proto")) ?? "https";
  const host =
    firstHeaderValue(headers.get("x-forwarded-host")) ??
    firstHeaderValue(headers.get("host"));
  if (!host) return null;
  return normalizeBaseUrl(`${proto}://${host}`);
}

/** URL pública para auth, emails y enlaces absolutos (prioriza NEXT_PUBLIC_APP_URL). */
export function appBaseUrlForAuth(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return normalizeBaseUrl(fromEnv);

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL no está configurada. Definila en Hostinger con la URL pública del subdominio (https://...)."
    );
  }

  return DEFAULT_APP_URL;
}

/** URL pública para QR, póster y enlaces en páginas server-side. */
export function resolvePublicBaseUrl(headers?: HeaderSource): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return normalizeBaseUrl(fromEnv);

  if (headers) {
    const fromRequest = baseUrlFromHeaders(headers);
    if (fromRequest) return fromRequest;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL no está configurada. Definila en Hostinger con la URL pública del subdominio (https://...)."
    );
  }

  return DEFAULT_APP_URL;
}

/** @deprecated Usá appBaseUrlForAuth o resolvePublicBaseUrl según el contexto. */
export function appBaseUrl(): string {
  return appBaseUrlForAuth();
}

export function urlVerificacionLogin(options?: {
  intent?: "admin" | "cliente";
  redirect?: string;
}): string {
  const params = new URLSearchParams();
  if (options?.intent) params.set("intent", options.intent);
  if (options?.redirect?.trim()) params.set("redirect", options.redirect.trim());
  const qs = params.toString();
  const base = appBaseUrlForAuth();
  return qs ? `${base}/login/verify?${qs}` : `${base}/login/verify`;
}

export function redirectDesdeUrl(href: string): string | undefined {
  try {
    const redirect = new URL(href).searchParams.get("redirect")?.trim();
    if (
      redirect &&
      redirect.startsWith("/") &&
      !redirect.startsWith("//") &&
      !redirect.includes("://")
    ) {
      return redirect;
    }
  } catch {
    // ignore
  }
  return undefined;
}
