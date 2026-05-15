import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAllowedAuthRequest } from "@/lib/auth/allowedOrigins";
import { passkeyLoginVerify, passkeysHabilitados } from "@/lib/auth/passkeys";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  response: z.custom<AuthenticationResponseJSON>()
});

export async function POST(req: Request) {
  if (!passkeysHabilitados()) {
    return NextResponse.json(
      { ok: false, error: "Passkeys no habilitadas." },
      { status: 404 }
    );
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
    return NextResponse.json(
      { ok: false, error: "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const { customToken } = await passkeyLoginVerify(
      parsed.data.email,
      parsed.data.response
    );
    return NextResponse.json({ ok: true, customToken });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
