import { NextResponse } from "next/server";
import { z } from "zod";
import { enviarEmailContactoLead } from "@/lib/email/contactLead";

export const runtime = "nodejs";

const ContactBody = z.object({
  nombreCompleto: z.string().min(2).max(120),
  nombreComercio: z.string().min(2).max(120),
  email: z.string().email().max(200),
  telefono: z.string().min(6).max(40),
  consulta: z.string().min(10).max(4000)
});

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = ContactBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    await enviarEmailContactoLead({
      nombreCompleto: parsed.data.nombreCompleto.trim(),
      nombreComercio: parsed.data.nombreComercio.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      telefono: parsed.data.telefono.trim(),
      consulta: parsed.data.consulta.trim()
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No se pudo enviar el mensaje";
    console.error("[contact]", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
