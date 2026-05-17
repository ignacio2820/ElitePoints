import { NextResponse } from "next/server";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { aplicarDisculpaEncuesta } from "@/lib/huellitas/encuestasAlertasService";
import { EnviarDisculpaBodySchema } from "@/lib/huellitas/encuestasTypes";

export const runtime = "nodejs";

type Params = { encuestaId: string };

export async function POST(
  req: Request,
  { params }: { params: Params }
) {
  try {
    const sesion = await requireAdmin();
    const body = EnviarDisculpaBodySchema.parse(await req.json());
    const result = await aplicarDisculpaEncuesta({
      localId: sesion.claims.localId,
      encuestaId: params.encuestaId,
      huellitas: body.huellitas,
      nota: body.nota,
      adminUid: sesion.uid,
      adminEmail: sesion.email
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }
    const msg =
      err instanceof Error ? err.message : "No se pudo enviar la disculpa.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
