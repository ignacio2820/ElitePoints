import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/server";
import { crearClienteConReferido } from "@/lib/huellitas/referidosService";
import {
  esEmailDuplicadoEnLocal,
  normalizarEmail,
  respuestaApiEmailDuplicado,
  validarEmailAntesDeCrearCliente
} from "@/lib/auth/persistenciaCliente";

export const runtime = "nodejs";

const Body = z.object({
  nombre: z.string().min(2).max(120),
  email: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? normalizarEmail(s) : "")),
  telefono: z.string().max(30).optional()
});

/**
 * Alta de cliente desde el panel admin (cartera).
 */
export async function POST(req: Request) {
  let sesion;
  try {
    sesion = await requireAdmin();
  } catch {
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
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const localId = sesion.claims.localId;
  const data = parsed.data;

  if (data.email && !data.email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
  }

  try {
    await validarEmailAntesDeCrearCliente({ localId, email: data.email });

    const result = await crearClienteConReferido({
      localId,
      cliente: {
        nombre: data.nombre.trim(),
        email: data.email,
        telefono: data.telefono?.trim() ?? ""
      }
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (esEmailDuplicadoEnLocal(err)) {
      return NextResponse.json(respuestaApiEmailDuplicado(), { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
