import { NextResponse } from "next/server";
import { z } from "zod";
import { getStorage } from "firebase-admin/storage";
import { getFirebaseStorageBucket } from "@/lib/firebase/storageBucket";
import { ErrorAuth, requireAdmin } from "@/lib/auth/server";
import { comprimirImagenSorteo } from "@/lib/images/compressImage";
import { cols } from "@/lib/firebase/collections";
import { adminDb } from "@/lib/firebase/admin";
import { actualizarImagenSorteo } from "@/lib/huellitas/sorteosService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MIME_PERMITIDOS = new Set(["image/jpeg", "image/png"]);

const PatchBody = z.object({
  imagen: z.string().url().max(8192)
});

async function sorteoExisteEnLocal(localId: string, sorteoId: string) {
  const snap = await cols.sorteo(adminDb(), localId, sorteoId).get();
  return snap.exists;
}

export async function PATCH(
  req: Request,
  { params }: { params: { sorteoId: string } }
) {
  try {
    const sesion = await requireAdmin();
    const existe = await sorteoExisteEnLocal(
      sesion.claims.localId,
      params.sorteoId
    );
    if (!existe) {
      return NextResponse.json(
        { ok: false, error: "Sorteo no encontrado." },
        { status: 404 }
      );
    }

    const body = PatchBody.parse(await req.json());
    const actualizado = await actualizarImagenSorteo(
      sesion.claims.localId,
      params.sorteoId,
      body.imagen
    );
    return NextResponse.json({ ok: true, imagen: body.imagen, sorteo: actualizado });
  } catch (err) {
    if (err instanceof ErrorAuth) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "URL de imagen inválida." },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { sorteoId: string } }
) {
  try {
    const sesion = await requireAdmin();
    const localId = sesion.claims.localId;
    const sorteoId = params.sorteoId;
    const existe = await sorteoExisteEnLocal(localId, sorteoId);
    if (!existe) {
      return NextResponse.json(
        { ok: false, error: "Sorteo no encontrado." },
        { status: 404 }
      );
    }

    const bucketName = getFirebaseStorageBucket();
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
        { ok: false, error: "Solo JPG o PNG." },
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
    const comprimida = await comprimirImagenSorteo(original);
    const objectPath = `locales/${localId}/sorteos/${sorteoId}.jpg`;
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
    const actualizado = await actualizarImagenSorteo(localId, sorteoId, imagen);

    return NextResponse.json({
      ok: true,
      imagen,
      bytes: comprimida.bytes,
      sorteo: actualizado
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
