import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireCliente } from "@/lib/auth/server";
import {
  agregarMascotaCliente,
  listarMascotasCliente
} from "@/lib/huellitas/mascotasClienteService";
import { EspecieSchema } from "@/lib/huellitas/types";

export const runtime = "nodejs";

const PostBody = z.object({
  nombre: z.string().min(1).max(60),
  especie: EspecieSchema,
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
});

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const sesion = await requireCliente();
    const mascotas = await listarMascotasCliente(
      sesion.claims.localId,
      sesion.claims.clienteId
    );
    return NextResponse.json({ ok: true, mascotas });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sesion = await requireCliente();
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
    }

    const parsed = PostBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { fechaNacimiento } = parsed.data;
    if (fechaNacimiento > hoyIso()) {
      return NextResponse.json(
        { ok: false, error: "La fecha de nacimiento no puede ser futura." },
        { status: 400 }
      );
    }

    const mascota = await agregarMascotaCliente(
      sesion.claims.localId,
      sesion.claims.clienteId,
      parsed.data
    );

    return NextResponse.json({ ok: true, mascota });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error";
    const status =
      msg.includes("Ya tenés una mascota") || msg.includes("registrada") ? 409 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

/** Los clientes no pueden eliminar mascotas (anti-fraude de cumpleaños). */
export async function DELETE() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "No podés eliminar mascotas desde la app. Solicitá el cambio al personal del local."
    },
    { status: 403 }
  );
}
