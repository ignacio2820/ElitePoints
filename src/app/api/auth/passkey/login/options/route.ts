import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAllowedAuthRequest } from "@/lib/auth/allowedOrigins";
import { passkeyLoginOptions, passkeysHabilitados } from "@/lib/auth/passkeys";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase())
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
      { ok: false, error: parsed.error.issues[0]?.message ?? "Email inválido" },
      { status: 400 }
    );
  }

  try {
    const options = await passkeyLoginOptions(parsed.data.email);
    return NextResponse.json({ ok: true, options });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
