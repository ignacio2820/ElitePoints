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
