import { NextResponse } from "next/server";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { eliminarEncuestaAdmin } from "@/lib/huellitas/encuestasAdminService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { encuestaId: string };

export async function DELETE(
  _req: Request,
  { params }: { params: Params }
) {
  try {
    const sesion = await requireAdmin();
    await eliminarEncuestaAdmin(sesion.claims.localId, params.encuestaId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : "No se pudo eliminar.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
