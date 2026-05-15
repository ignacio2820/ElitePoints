import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase/admin";
import { assertAllowedAuthRequest } from "@/lib/auth/allowedOrigins";
import { buscarIdentidadPorEmail } from "@/lib/auth/identityIndex";
import { contarPasskeysPorEmail, passkeysHabilitados } from "@/lib/auth/passkeys";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase())
});

/**
 * Detecta el rol del email para el login (sin enviar magic link).
 * Consulta índices `owners` y `customers` con respaldo legacy.
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
    const identidad = await buscarIdentidadPorEmail(email);

    if (identidad?.tipo === "owner") {
      let tienePassword = false;
      try {
        const u = await adminAuth().getUserByEmail(email);
        tienePassword = u.providerData.some((p) => p.providerId === "password");
      } catch {
        // sin usuario Auth aún
      }
      const passkeys =
        passkeysHabilitados() ? await contarPasskeysPorEmail(email) : 0;
      return NextResponse.json({
        ok: true,
        role: "admin" as const,
        tienePassword,
        tienePasskey: passkeys > 0
      });
    }

    if (identidad?.tipo === "customer") {
      return NextResponse.json({ ok: true, role: "cliente" as const });
    }

    return NextResponse.json({ ok: true, role: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
