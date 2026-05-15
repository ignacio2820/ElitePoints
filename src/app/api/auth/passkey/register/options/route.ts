import { NextResponse } from "next/server";
import { getSesion } from "@/lib/auth/server";
import { passkeyRegistrationOptions, passkeysHabilitados } from "@/lib/auth/passkeys";
import { adminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST() {
  if (!passkeysHabilitados()) {
    return NextResponse.json(
      { ok: false, error: "Passkeys no habilitadas." },
      { status: 404 }
    );
  }

  try {
    const sesion = await getSesion();
    if (!sesion) {
      return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
    }
    const user = await adminAuth().getUser(sesion.uid);
    const email = user.email;
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Tu cuenta no tiene email." },
        { status: 400 }
      );
    }

    const options = await passkeyRegistrationOptions(sesion.uid, email);
    return NextResponse.json({ ok: true, options });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
