import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { getInfoLocal, setInfoLocal } from "@/lib/huellitas/localService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

export async function POST(req: Request) {
  try {
    const sesion = await requireAdmin();
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Firebase Storage no está configurado. Usá una URL de imagen o definí NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET."
        },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Falta el archivo del logo." },
        { status: 400 }
      );
    }

    const ext = MIME_TO_EXT[file.type];
    if (!ext) {
      return NextResponse.json(
        { ok: false, error: "Formato no soportado. Usá JPG, PNG, WEBP o GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "El logo no puede superar 2 MB." },
        { status: 400 }
      );
    }

    const localId = sesion.claims.localId;
    const buffer = Buffer.from(await file.arrayBuffer());
    const objectPath = `Locales/${localId}/brand/logo.${ext}`;
    const bucket = getStorage().bucket(bucketName);
    const object = bucket.file(objectPath);

    await object.save(buffer, {
      metadata: {
        contentType: file.type,
        cacheControl: "public,max-age=31536000"
      },
      resumable: false
    });
    await object.makePublic();

    const logoUrl = `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
    await setInfoLocal(localId, { logoUrl });
    const info = await getInfoLocal(localId);

    return NextResponse.json({ ok: true, logoUrl, info });
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
