import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAllowedAuthRequest } from "@/lib/auth/allowedOrigins";
import {
  contarPasskeysPorEmail,
  passkeysHabilitados
} from "@/lib/auth/passkeys";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase())
});

const MENSAJE_SIN_PASSKEY =
  "Aún no registraste tu huella. Ingresá con tu email (link mágico o contraseña) una vez y activala en Configuración → Acceso con huella o passkey.";

export async function POST(req: Request) {
  if (!passkeysHabilitados()) {
    return NextResponse.json({
      ok: false,
      code: "NOT_ENABLED",
      error: "Passkeys no habilitadas."
    });
  }

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

  const total = await contarPasskeysPorEmail(parsed.data.email);

  if (total === 0) {
    return NextResponse.json({
      ok: false,
      tieneCredenciales: false,
      code: "NO_CREDENTIALS",
      error: MENSAJE_SIN_PASSKEY
    });
  }

  return NextResponse.json({
    ok: true,
    tieneCredenciales: true,
    webAuthnDisponible: true
  });
}
