import { describe, expect, it } from "vitest";
import { createLineSplitterTransform } from "./createLineSplitterTransform";

async function leerLineas(chunks: string[]): Promise<string[]> {
  const splitter = createLineSplitterTransform();
  const writer = splitter.writable.getWriter();
  const reader = splitter.readable.getReader();
  const lineas: string[] = [];

  const consumir = (async () => {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value !== undefined) lineas.push(value);
    }
  })();

  for (const c of chunks) {
    await writer.write(c);
  }
  await writer.close();
  await consumir;
  return lineas;
}

describe("createLineSplitterTransform", () => {
  it("corta en \\r y limpia el acumulador", async () => {
    const lineas = await leerLineas(["MP-CLIENTE:abc", "\r", "resto"]);
    expect(lineas).toEqual(["MP-CLIENTE:abc"]);
  });

  it("corta en \\n", async () => {
    const lineas = await leerLineas(["ABC-123\n"]);
    expect(lineas).toEqual(["ABC-123"]);
  });

  it("trata CRLF como un solo fin de línea", async () => {
    const lineas = await leerLineas(["uno\r\n", "dos\n"]);
    expect(lineas).toEqual(["uno", "dos"]);
  });

  it("no duplica si el carácter llega en trozos", async () => {
    const lineas = await leerLineas(["12", "34", "\r", "56\r"]);
    expect(lineas).toEqual(["1234", "56"]);
  });
});
