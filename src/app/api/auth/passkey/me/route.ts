import { NextResponse } from "next/server";
import { getSesion } from "@/lib/auth/server";
import { contarPasskeysPorUid, passkeysHabilitados } from "@/lib/auth/passkeys";

export const runtime = "nodejs";

/** Passkeys registradas para el usuario autenticado (vinculadas al uid de Firebase). */
export async function GET() {
  if (!passkeysHabilitados()) {
    return NextResponse.json({
      ok: true,
      habilitado: false,
      tieneCredenciales: false
    });
  }

  const sesion = await getSesion();
  if (!sesion) {
    return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  }

  const total = await contarPasskeysPorUid(sesion.uid);
  return NextResponse.json({
    ok: true,
    habilitado: true,
    tieneCredenciales: total > 0,
    uid: sesion.uid
  });
}
