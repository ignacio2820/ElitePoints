import { getStorage } from "firebase-admin/storage";
import { getFirebaseStorageBucket } from "@/lib/firebase/storageBucket";

/** Rutas posibles de la imagen de un sorteo en Storage. */
export function rutasImagenSorteo(localId: string, sorteoId: string): string[] {
  return [
    `locales/${localId}/sorteos/${sorteoId}.jpg`,
    `Locales/${localId}/sorteos/${sorteoId}.jpg`
  ];
}

function rutaDesdeUrlPublica(imagenUrl: string, bucketName: string): string | null {
  try {
    const u = new URL(imagenUrl);
    if (!u.hostname.includes("storage.googleapis.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === bucketName && parts.length > 1) {
      return parts.slice(1).join("/");
    }
    if (parts.length >= 2) {
      return parts.slice(1).join("/");
    }
  } catch {
    return null;
  }
  return null;
}

export async function borrarImagenSorteoStorage(
  localId: string,
  sorteoId: string,
  imagenUrl?: string
): Promise<void> {
  const bucketName = getFirebaseStorageBucket();
  if (!bucketName) return;

  const bucket = getStorage().bucket(bucketName);
  const paths = new Set(rutasImagenSorteo(localId, sorteoId));

  if (imagenUrl?.trim()) {
    const fromUrl = rutaDesdeUrlPublica(imagenUrl.trim(), bucketName);
    if (fromUrl) paths.add(fromUrl);
  }

  await Promise.all(
    [...paths].map((path) =>
      bucket
        .file(path)
        .delete({ ignoreNotFound: true })
        .catch(() => undefined)
    )
  );
}
