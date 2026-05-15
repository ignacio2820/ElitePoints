import { NextResponse } from "next/server";
import { z } from "zod";
import { getSesion } from "@/lib/auth/server";
import { passkeyRegistrationVerify, passkeysHabilitados } from "@/lib/auth/passkeys";
import { adminAuth } from "@/lib/firebase/admin";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

export const runtime = "nodejs";

const Body = z.object({
  response: z.custom<RegistrationResponseJSON>()
});

export async function POST(req: Request) {
  if (!passkeysHabilitados()) {
    return NextResponse.json(
      { ok: false, error: "Passkeys no habilitadas." },
      { status: 404 }
    );
  }

  const sesion = await getSesion();
  if (!sesion) {
    return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Respuesta inválida" }, { status: 400 });
  }

  try {
    const user = await adminAuth().getUser(sesion.uid);
    const email = user.email;
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Tu cuenta no tiene email." },
        { status: 400 }
      );
    }
    await passkeyRegistrationVerify(sesion.uid, email, parsed.data.response);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
