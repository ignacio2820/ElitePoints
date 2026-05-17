"use client";

import { auth, isFirebaseConfigured } from "@/lib/firebase/client";
import { subirImagenSorteoCliente } from "@/lib/firebase/storageUploadsClient";
import { withTimeout } from "@/lib/async/withTimeout";
import { comprimirImagenSorteoEnCliente } from "@/lib/images/compressImageClient";

const MS_COMPRIMIR = 30_000;
const MS_STORAGE = 45_000;
const MS_API = 30_000;

async function parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) {
    return { ok: false, error: `Respuesta vacía del servidor (${res.status}).` };
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { ok: false, error: `Respuesta inválida del servidor (${res.status}).` };
  }
}

async function persistirUrlImagenSorteo(
  sorteoId: string,
  imagen: string
): Promise<void> {
  const res = await withTimeout(
    fetch(`/api/admin/sorteos/${encodeURIComponent(sorteoId)}/imagen`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ imagen })
    }),
    MS_API,
    "No se pudo vincular la imagen al sorteo."
  );
  const data = await parseJsonResponse(res);
  if (!res.ok || data.ok !== true) {
    throw new Error(
      typeof data.error === "string" ? data.error : "No pudimos guardar la imagen."
    );
  }
}

export async function subirImagenSorteoPorApi(
  sorteoId: string,
  archivo: File
): Promise<string> {
  const fd = new FormData();
  fd.append("file", archivo);
  const res = await withTimeout(
    fetch(`/api/admin/sorteos/${encodeURIComponent(sorteoId)}/imagen`, {
      method: "POST",
      body: fd,
      credentials: "same-origin"
    }),
    MS_API,
    "La subida de la imagen al servidor tardó demasiado."
  );
  const data = await parseJsonResponse(res);
  if (!res.ok || data.ok !== true) {
    throw new Error(
      typeof data.error === "string" ? data.error : "No pudimos subir la imagen."
    );
  }
  const imagen = typeof data.imagen === "string" ? data.imagen : "";
  if (!imagen) {
    throw new Error("El servidor no devolvió la URL de la imagen.");
  }
  return imagen;
}

/**
 * Comprime en cliente (800px / JPEG 75 %), sube a Storage y guarda URL en Firestore.
 */
export async function resolverUrlImagenSorteo(input: {
  localId: string;
  sorteoId: string;
  imagenFile: File;
}): Promise<string> {
  const comprimida = await withTimeout(
    comprimirImagenSorteoEnCliente(input.imagenFile),
    MS_COMPRIMIR,
    "Comprimir la imagen tardó demasiado. Probá con otra foto."
  );

  const puedeStorageCliente =
    isFirebaseConfigured() && Boolean(auth.currentUser);

  if (puedeStorageCliente) {
    try {
      const url = await withTimeout(
        subirImagenSorteoCliente(input.localId, input.sorteoId, comprimida),
        MS_STORAGE,
        "La subida a Firebase Storage tardó demasiado."
      );
      const imagenUrl = url.trim();
      if (!imagenUrl) throw new Error("Storage no devolvió una URL válida.");
      await persistirUrlImagenSorteo(input.sorteoId, imagenUrl);
      return imagenUrl;
    } catch {
      // fallback servidor
    }
  }

  return subirImagenSorteoPorApi(input.sorteoId, comprimida);
}
