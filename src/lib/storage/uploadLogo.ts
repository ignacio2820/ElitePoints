import { randomUUID } from "crypto";
import { getStorage } from "firebase-admin/storage";
import { comprimirImagenPremio } from "@/lib/images/compressImage";
import { setInfoLocal } from "@/lib/huellitas/localService";

const MIME_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp"]);

function downloadUrlFirebase(
  bucketName: string,
  objectPath: string,
  token: string
) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

function bucketNameOrThrow(): string {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  if (!bucketName) {
    throw new Error(
      "Firebase Storage no está configurado. Definí NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET."
    );
  }
  return bucketName;
}

/**
 * Comprime (WebP) y sube el logo del local a Storage.
 * Acepta JPG/PNG/WebP de entrada; persiste siempre como .webp.
 */
export async function subirLogoLocal(
  localId: string,
  input: Buffer,
  mime?: string
): Promise<string> {
  const tipo = (mime ?? "").toLowerCase();
  if (tipo && !MIME_PERMITIDOS.has(tipo)) {
    throw new Error("Formato no soportado. Usá JPG, JPEG o PNG.");
  }

  const bucketName = bucketNameOrThrow();
  const comprimida = await comprimirImagenPremio(input, mime);
  const objectPath = `logos/${localId}/logo.${comprimida.ext}`;
  const bucket = getStorage().bucket(bucketName);
  const object = bucket.file(objectPath);
  const downloadToken = randomUUID();

  await object.save(comprimida.buffer, {
    metadata: {
      contentType: comprimida.contentType,
      cacheControl: "public,max-age=31536000",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken
      }
    },
    resumable: false
  });

  const logoUrl = downloadUrlFirebase(
    bucket.name,
    objectPath,
    downloadToken
  );
  await setInfoLocal(localId, { logoUrl });
  return logoUrl;
}
