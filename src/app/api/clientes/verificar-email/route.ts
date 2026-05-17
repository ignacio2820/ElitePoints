import { NextResponse } from "next/server";
import { z } from "zod";
import { emailExisteEnLocal, normalizarEmail } from "@/lib/auth/persistenciaCliente";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().min(1, "Email requerido"),
  localId: z.string().min(1, "localId requerido")
});

/**
 * Comprueba si un email está libre en Locales/{localId}/Clientes.
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const email = normalizarEmail(parsed.data.email);
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
  }

  try {
    const existe = await emailExisteEnLocal(parsed.data.localId, email);
    return NextResponse.json({ ok: true, disponible: !existe });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
