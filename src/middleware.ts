import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION } from "@/lib/auth/types";

/**
 * Middleware ligero — solo verifica la PRESENCIA de la session cookie.
 *
 * La verificación criptográfica completa (firma + claims + RBAC) y el
 * aislamiento multi-tenant por `localId` se hacen en layouts y APIs con
 * `getSesion()` / `requireAdmin()` (Admin SDK, no disponible en edge).
 *
 * Si no hay cookie en una ruta protegida, redirige al login con `?redirect=`
 * para volver al destino original tras autenticar.
 */

const RUTAS_PROTEGIDAS = ["/admin", "/mi-cuenta", "/dashboard", "/portal"];

function esRutaPortalCliente(pathname: string): boolean {
  return (
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/mi-cuenta" ||
    pathname.startsWith("/mi-cuenta/")
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const necesitaSesion = RUTAS_PROTEGIDAS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!necesitaSesion) {
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    return res;
  }

  const cookie = req.cookies.get(COOKIE_SESION)?.value;
  if (cookie) {
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    return res;
  }

  const destino = `${pathname}${req.nextUrl.search}`;
  const url = req.nextUrl.clone();

  /**
   * Portal cliente: la cookie httpOnly a veces se pierde en PWA (iOS),
   * pero Firebase Auth sigue en IndexedDB. Redirigimos a /auth/restaurar
   * para re-emitir la cookie sin pedir magic link.
   */
  if (esRutaPortalCliente(pathname)) {
    url.pathname = "/auth/restaurar";
    url.search = `?redirect=${encodeURIComponent(destino)}`;
    return NextResponse.redirect(url);
  }

  url.pathname = "/login";
  url.search = `?redirect=${encodeURIComponent(destino)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/mi-cuenta",
    "/mi-cuenta/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/portal",
    "/portal/:path*"
  ]
};
