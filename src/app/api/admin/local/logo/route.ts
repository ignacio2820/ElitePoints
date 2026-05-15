import { NextResponse } from "next/server";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { getInfoLocal } from "@/lib/huellitas/localService";
import { subirLogoLocal } from "@/lib/storage/uploadLogo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const sesion = await requireAdmin();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Falta el archivo del logo." },
        { status: 400 }
      );
    }

    const tipo = file.type.toLowerCase();
    const nombre = file.name.toLowerCase();
    const permitido =
      tipo === "image/jpeg" ||
      tipo === "image/png" ||
      tipo === "image/webp" ||
      nombre.endsWith(".jpg") ||
      nombre.endsWith(".jpeg") ||
      nombre.endsWith(".png");

    if (!permitido) {
      return NextResponse.json(
        { ok: false, error: "Formato no soportado. Usá JPG, JPEG o PNG." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "La imagen no puede superar 8 MB antes de comprimir." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const logoUrl = await subirLogoLocal(
      sesion.claims.localId,
      buffer,
      file.type || undefined
    );
    const info = await getInfoLocal(sesion.claims.localId);

    return NextResponse.json({ ok: true, logoUrl, info });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
