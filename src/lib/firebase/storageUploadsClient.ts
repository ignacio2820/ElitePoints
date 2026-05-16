"use client";

/**
 * Subidas a Firebase Storage desde el navegador (uploadBytes + getDownloadURL).
 * Requiere reglas de Storage + Firebase Auth activo en el navegador.
 */

import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
  type FirebaseStorage,
  type UploadResult
} from "firebase/storage";
import app from "@/lib/firebase/client";

function storage(): FirebaseStorage {
  return getStorage(app);
}

function mensajeErrorStorage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code?: string }).code);
    if (code === "storage/unauthorized") {
      return "No tenés permiso para subir imágenes. Volvé a entrar con el link mágico o contraseña.";
    }
    if (code === "storage/canceled") {
      return "La subida fue cancelada.";
    }
    if (code === "storage/retry-limit-exceeded") {
      return "Firebase Storage no respondió. Reintentá en unos segundos.";
    }
  }
  return err instanceof Error ? err.message : "Error al subir la imagen a Storage.";
}

/**
 * a) uploadBytes(storageRef, file)
 * b) await getDownloadURL(snapshot.ref)
 */
export async function subirImagenPremioCliente(
  localId: string,
  data: Blob,
  contentType: string
): Promise<string> {
  const path = `Locales/${localId}/premios/_client/${crypto.randomUUID()}.webp`;
  const storageRef = ref(storage(), path);
  let snapshot: UploadResult;
  try {
    snapshot = await uploadBytes(storageRef, data, { contentType });
  } catch (err) {
    throw new Error(mensajeErrorStorage(err));
  }
  try {
    return await getDownloadURL(snapshot.ref);
  } catch (err) {
    throw new Error(mensajeErrorStorage(err));
  }
}

export async function subirLogoLocalCliente(
  localId: string,
  data: Blob,
  contentType: string
): Promise<string> {
  const path = `logos/${localId}/client-${crypto.randomUUID()}.webp`;
  const storageRef = ref(storage(), path);
  let snapshot: UploadResult;
  try {
    snapshot = await uploadBytes(storageRef, data, { contentType });
  } catch (err) {
    throw new Error(mensajeErrorStorage(err));
  }
  try {
    return await getDownloadURL(snapshot.ref);
  } catch (err) {
    throw new Error(mensajeErrorStorage(err));
  }
}
