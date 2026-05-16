"use client";

import { auth, isFirebaseConfigured } from "@/lib/firebase/client";
import { subirImagenPremioCliente } from "@/lib/firebase/storageUploadsClient";
import { withTimeout } from "@/lib/async/withTimeout";
import { comprimirImagenEnCliente } from "@/lib/images/compressImageClient";

const MS_COMPRIMIR = 30_000;
const MS_STORAGE = 45_000;
const MS_API_IMAGEN = 60_000;

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

/** Sube imagen vía API (Admin SDK) cuando ya existe el id del premio. */
export async function subirImagenPremioPorApi(
  premioId: string,
  archivo: File
): Promise<{ imagen: string; premio: unknown }> {
  const fd = new FormData();
  fd.append("file", archivo);
  const res = await withTimeout(
    fetch(`/api/admin/premios/${premioId}/imagen`, {
      method: "POST",
      body: fd,
      credentials: "same-origin"
    }),
    MS_API_IMAGEN,
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
  return { imagen, premio: data.premio };
}

/**
 * Comprime y obtiene URL pública.
 * 1) Storage cliente (uploadBytes + getDownloadURL) si hay Auth.
 * 2) Si falla, requiere premioId para subir por API.
 */
export async function resolverUrlImagenPremio(input: {
  localId: string;
  imagenFile: File;
  premioIdParaFallback?: string;
}): Promise<string> {
  const comprimida = await withTimeout(
    comprimirImagenEnCliente(input.imagenFile),
    MS_COMPRIMIR,
    "Comprimir la imagen tardó demasiado. Probá con otra foto."
  );

  const puedeStorageCliente =
    isFirebaseConfigured() && Boolean(auth.currentUser);

  if (puedeStorageCliente) {
    try {
      const url = await withTimeout(
        subirImagenPremioCliente(
          input.localId,
          comprimida,
          comprimida.type || "image/webp"
        ),
        MS_STORAGE,
        "La subida a Firebase Storage tardó demasiado."
      );
      if (!url.trim()) {
        throw new Error("Storage no devolvió una URL válida.");
      }
      return url.trim();
    } catch (err) {
      if (!input.premioIdParaFallback) {
        throw err instanceof Error
          ? err
          : new Error("No pudimos subir la imagen a Storage.");
      }
    }
  }

  if (!input.premioIdParaFallback) {
    throw new Error(
      "Para subir la foto necesitás sesión de Firebase en este navegador. " +
        "Cerrá sesión, entrá de nuevo con el link mágico y reintentá, " +
        "o guardá el premio sin foto y editá después."
    );
  }

  const { imagen } = await subirImagenPremioPorApi(
    input.premioIdParaFallback,
    comprimida
  );
  return imagen;
}
