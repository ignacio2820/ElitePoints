import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { normalizarCodigo } from "@/lib/huellitas/referidos";
import {
  esEmailDuplicadoEnLocal,
  normalizarEmail,
  respuestaApiEmailDuplicado,
  validarEmailAntesDeCrearCliente
} from "@/lib/auth/persistenciaCliente";

export const runtime = "nodejs";

const Body = z.object({
  localId: z.string().min(1, "localId requerido"),
  nombre: z.string().min(2).max(120),
  email: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? normalizarEmail(s) : "")),
  telefono: z.string().max(30).optional(),
  codigoReferido: z.string().max(20).optional()
});

export async function POST(req: Request) {
  let raw: unknown = {};
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
  const data = parsed.data;

  if (data.email && !data.email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
  }

  try {
    const localSnap = await cols.local(adminDb(), data.localId).get();
    if (!localSnap.exists) {
      return NextResponse.json(
        { ok: false, error: `El local "${data.localId}" no existe.` },
        { status: 404 }
      );
    }

    await validarEmailAntesDeCrearCliente({
      localId: data.localId,
      email: data.email
    });

    const { crearClienteConReferido } = await import(
      "@/lib/huellitas/referidosService"
    );
    const result = await crearClienteConReferido({
      localId: data.localId,
      cliente: {
        nombre: data.nombre.trim(),
        email: data.email,
        telefono: data.telefono?.trim() ?? ""
      },
      codigoReferenteRaw: data.codigoReferido
        ? normalizarCodigo(data.codigoReferido)
        : undefined
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
