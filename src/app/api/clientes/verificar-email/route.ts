import { NextResponse } from "next/server";
import { z } from "zod";
import {
  emailClienteDisponible,
  normalizarEmailCliente
} from "@/lib/huellitas/validarEmailCliente";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().min(1, "Email requerido"),
  localId: z.string().min(1).optional()
});

/**
 * Comprueba si un email de cliente está libre (consulta índice + Firestore).
 * Usado por formularios antes de enviar el alta.
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

  const email = normalizarEmailCliente(parsed.data.email);
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
  }

  try {
    const disponible = await emailClienteDisponible(email, parsed.data.localId);
    return NextResponse.json({ ok: true, disponible });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
