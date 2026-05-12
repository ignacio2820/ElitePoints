const DEFAULT_APP_URL = "http://localhost:3000";

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(/\/$/, "");
}

export function urlVerificacionLogin(options?: {
  intent?: "admin" | "cliente";
  redirect?: string;
}): string {
  const params = new URLSearchParams();
  if (options?.intent) params.set("intent", options.intent);
  if (options?.redirect?.trim()) params.set("redirect", options.redirect.trim());
  const qs = params.toString();
  return qs ? `${appBaseUrl()}/login/verify?${qs}` : `${appBaseUrl()}/login/verify`;
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
