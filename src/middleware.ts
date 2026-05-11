import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION } from "@/lib/auth/types";

/**
 * Middleware ligero — solo verifica la PRESENCIA de la session cookie.
 *
 * La verificación criptográfica completa (firma + claims + RBAC) se hace
 * en cada layout protegido con `getSesion()` (que usa Admin SDK, no
 * disponible en el runtime edge del middleware).
 *
 * El gate de membresía para Caja y Clientes vive en el layout admin y en
 * `requireMembresiaActiva`, leyendo `estadoMembresia`, `trialHasta` y
 * `fechaVencimiento` desde Firestore.
 *
 * Si no hay cookie en una ruta protegida, redirige al login con `?redirect=`
 * para volver al destino original tras autenticar.
 */

const RUTAS_PROTEGIDAS = ["/admin", "/mi-cuenta"];

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

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  // No forzamos intent: el endpoint detecta admin/cliente automáticamente
  // según el email. Solo conservamos el redirect para volver al destino.
  const destino = `${pathname}${req.nextUrl.search}`;
  url.search = `?redirect=${encodeURIComponent(destino)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/mi-cuenta/:path*"]
};
