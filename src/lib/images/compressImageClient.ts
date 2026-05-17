const MAX_EDGE = 1200;
const MAX_BYTES = 450_000;
const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52];

function leerComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No pudimos leer la imagen."));
    reader.readAsDataURL(file);
  });
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No pudimos procesar la imagen."));
    img.src = src;
  });
}

async function canvasAWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No pudimos comprimir la imagen."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality
    );
  });
}

export async function comprimirImagenEnCliente(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Elegí un archivo de imagen.");
  }

  const dataUrl = await leerComoDataUrl(file);
  const img = await cargarImagen(dataUrl);
  const escala = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * escala));
  const height = Math.max(1, Math.round(img.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No pudimos preparar la imagen.");
  ctx.drawImage(img, 0, 0, width, height);

  let blob = await canvasAWebp(canvas, QUALITY_STEPS[0]);
  for (const quality of QUALITY_STEPS.slice(1)) {
    if (blob.size <= MAX_BYTES) break;
    blob = await canvasAWebp(canvas, quality);
  }

  if (blob.size > MAX_BYTES) {
    throw new Error("La imagen sigue siendo muy pesada. Probá con otra foto.");
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "premio";
  return new File([blob], `${base}.webp`, { type: "image/webp" });
}

const SORTEO_MAX_WIDTH = 800;
const SORTEO_JPEG_QUALITY = 0.75;
const MIME_SORTEO = new Set(["image/jpeg", "image/png"]);

async function canvasAJpeg(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No pudimos comprimir la imagen."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

/** Sorteos: máx. 800px de ancho, JPEG al 75 % (~pocos KB). */
export async function comprimirImagenSorteoEnCliente(file: File): Promise<File> {
  if (!MIME_SORTEO.has(file.type)) {
    throw new Error("Solo se permiten imágenes JPG o PNG.");
  }

  const dataUrl = await leerComoDataUrl(file);
  const img = await cargarImagen(dataUrl);
  const escala = Math.min(1, SORTEO_MAX_WIDTH / Math.max(img.width, 1));
  const width = Math.max(1, Math.round(img.width * escala));
  const height = Math.max(1, Math.round(img.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No pudimos preparar la imagen.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await canvasAJpeg(canvas, SORTEO_JPEG_QUALITY);
  return new File([blob], "sorteo.jpg", { type: "image/jpeg" });
}
