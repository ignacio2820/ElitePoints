import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase/admin";
import { assertAllowedAuthRequest } from "@/lib/auth/allowedOrigins";
import { buscarClientePorEmailGlobal } from "@/lib/huellitas/clientesService";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase())
});

/**
 * Detecta el rol del email para el login (sin enviar magic link).
 * Solo indica si es dueño (admin), cliente o desconocido.
 */
export async function POST(req: Request) {
  try {
    assertAllowedAuthRequest(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Origen no autorizado";
    return NextResponse.json({ ok: false, error: msg }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
  }

  const { email } = parsed.data;

  try {
    const auth = adminAuth();
    try {
      const u = await auth.getUserByEmail(email);
      const claims = u.customClaims ?? {};
      if (claims.role === "admin" && typeof claims.localId === "string") {
        return NextResponse.json({
          ok: true,
          role: "admin" as const,
          tienePassword: u.providerData.some((p) => p.providerId === "password")
        });
      }
    } catch {
      // no es admin en Auth
    }

    const cli = await buscarClientePorEmailGlobal(email);
    if (cli) {
      return NextResponse.json({ ok: true, role: "cliente" as const });
    }

    return NextResponse.json({ ok: true, role: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
