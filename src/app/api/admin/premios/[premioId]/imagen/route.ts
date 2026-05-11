import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { comprimirImagenPremio } from "@/lib/images/compressImage";
import { actualizarPremio, obtenerPremio } from "@/lib/huellitas/premiosService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MIME_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

export async function POST(
  req: Request,
  { params }: { params: { premioId: string } }
) {
  try {
    const sesion = await requireAdmin();
    const localId = sesion.claims.localId;
    const premioId = params.premioId;
    const existente = await obtenerPremio(localId, premioId);
    if (!existente || existente.localId !== localId) {
      return NextResponse.json(
        { ok: false, error: "Premio no encontrado en este local." },
        { status: 404 }
      );
    }

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Firebase Storage no está configurado. Definí NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET."
        },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Falta el archivo de imagen." },
        { status: 400 }
      );
    }
    if (!MIME_PERMITIDOS.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Formato no soportado. Usá JPG, PNG, WEBP o GIF." },
        { status: 400 }
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { ok: false, error: "La imagen original no puede superar 8 MB." },
        { status: 400 }
      );
    }

    const original = Buffer.from(await file.arrayBuffer());
    const comprimida = await comprimirImagenPremio(original, file.type);
    const objectPath = `Locales/${localId}/premios/${premioId}.${comprimida.ext}`;
    const bucket = getStorage().bucket(bucketName);
    const object = bucket.file(objectPath);

    await object.save(comprimida.buffer, {
      metadata: {
        contentType: comprimida.contentType,
        cacheControl: "public,max-age=31536000"
      },
      resumable: false
    });
    await object.makePublic();

    const imagen = `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
    const premio = await actualizarPremio(localId, premioId, { imagen });
    return NextResponse.json({
      ok: true,
      imagen,
      bytes: comprimida.bytes,
      premio
    });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
