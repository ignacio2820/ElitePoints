import sharp from "sharp";

const MAX_WIDTH = 1200;
const MAX_BYTES = 450_000;
const QUALITY_STEPS = [82, 72, 62, 52];

export interface ImagenComprimida {
  buffer: Buffer;
  contentType: "image/webp";
  ext: "webp";
  bytes: number;
}

export async function comprimirImagenPremio(
  input: Buffer,
  mime?: string
): Promise<ImagenComprimida> {
  let pipeline = sharp(input, { failOn: "none" });
  if (mime === "image/gif") {
    pipeline = sharp(input, { animated: false, failOn: "none" });
  }

  const meta = await pipeline.metadata();
  if ((meta.width ?? 0) > MAX_WIDTH) {
    pipeline = pipeline.resize({
      width: MAX_WIDTH,
      withoutEnlargement: true
    });
  }

  let buffer = await pipeline
    .rotate()
    .webp({ quality: QUALITY_STEPS[0], effort: 4 })
    .toBuffer();

  for (const quality of QUALITY_STEPS.slice(1)) {
    if (buffer.byteLength <= MAX_BYTES) break;
    buffer = await sharp(buffer).webp({ quality, effort: 4 }).toBuffer();
  }

  if (buffer.byteLength > MAX_BYTES) {
    throw new Error(
      "La imagen sigue siendo muy pesada después de comprimirla. Probá con otra foto."
    );
  }

  return {
    buffer,
    contentType: "image/webp",
    ext: "webp",
    bytes: buffer.byteLength
  };
}
