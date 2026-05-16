"use client";

/**
 * Subidas a Firebase Storage desde el navegador (uploadBytes + getDownloadURL).
 * Requiere reglas de Storage que permitan a admins autenticados escribir estas rutas.
 * Si falla, los formularios hacen fallback al upload vía API (Admin SDK).
 */

import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
  type FirebaseStorage
} from "firebase/storage";
import app from "@/lib/firebase/client";

function storage(): FirebaseStorage {
  return getStorage(app);
}

export async function subirLogoLocalCliente(
  localId: string,
  data: Blob,
  contentType: string
): Promise<string> {
  const path = `logos/${localId}/client-${crypto.randomUUID()}.webp`;
  const r = ref(storage(), path);
  await uploadBytes(r, data, { contentType });
  return getDownloadURL(r);
}

export async function subirImagenPremioCliente(
  localId: string,
  data: Blob,
  contentType: string
): Promise<string> {
  const path = `Locales/${localId}/premios/_client/${crypto.randomUUID()}.webp`;
  const r = ref(storage(), path);
  await uploadBytes(r, data, { contentType });
  return getDownloadURL(r);
}
