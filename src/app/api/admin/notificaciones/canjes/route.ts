import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import {
  listarNotificacionesCanjes,
  marcarNotificacionesCanjeLeidas
} from "@/lib/huellitas/redemptionService";

export const runtime = "nodejs";

const MarcarBody = z.object({
  ids: z.array(z.string().min(1)).min(1)
});

export async function GET(req: Request) {
  try {
    const sesion = await requireAdmin();
    const url = new URL(req.url);
    const soloNoLeidas = url.searchParams.get("noLeidas") === "1";

    const notificaciones = await listarNotificacionesCanjes(
      sesion.claims.localId,
      { soloNoLeidas, limite: 25 }
    );

    return NextResponse.json({ ok: true, notificaciones });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const sesion = await requireAdmin();
    const raw = await req.json();
    const parsed = MarcarBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "ids requerido" },
        { status: 400 }
      );
    }

    await marcarNotificacionesCanjeLeidas(
      sesion.claims.localId,
      parsed.data.ids
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
