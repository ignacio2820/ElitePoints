import { createLineSplitterTransform } from "@/lib/serial/createLineSplitterTransform";

export const BAUD_RATE_LECTOR_DEFAULT = 9600;

export type OpcionesLecturaSerial = {
  baudRate?: number;
  signal?: AbortSignal;
};

/**
 * Abre el puerto y procesa líneas con TextDecoderStream + divisor por CR/LF.
 */
export async function leerLineasPuertoSerial(
  port: SerialPort,
  onLinea: (linea: string) => void | Promise<void>,
  opts: OpcionesLecturaSerial = {}
): Promise<void> {
  const { baudRate = BAUD_RATE_LECTOR_DEFAULT, signal } = opts;

  if (!port.readable) {
    throw new Error("El puerto no expone lectura.");
  }

  await port.open({ baudRate });

  const textDecoder = new TextDecoderStream();
  const lineSplitter = createLineSplitterTransform();
  const pipeline = port.readable
    .pipeThrough(
      textDecoder as unknown as ReadableWritablePair<
        string,
        Uint8Array
      >
    )
    .pipeThrough(lineSplitter);
  const reader = pipeline.getReader();

  try {
    while (!signal?.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      if (typeof value !== "string") continue;
      await onLinea(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ya liberado
    }
    try {
      await port.close();
    } catch {
      // ignore
    }
  }
}
