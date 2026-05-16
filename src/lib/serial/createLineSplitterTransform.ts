/**
 * Acumulador de texto que emite una línea por cada `\r` o `\n`.
 * Tras CRLF consume ambos caracteres para no generar una línea vacía extra.
 */
export function createLineSplitterTransform(): TransformStream<string, string> {
  let buffer = "";

  function emitCompletas(
    controller: TransformStreamDefaultController<string>
  ) {
    for (;;) {
      const idxCr = buffer.indexOf("\r");
      const idxLf = buffer.indexOf("\n");
      let idx = -1;
      let terminador: "\r" | "\n" | null = null;

      if (idxCr >= 0 && (idxLf < 0 || idxCr <= idxLf)) {
        idx = idxCr;
        terminador = "\r";
      } else if (idxLf >= 0) {
        idx = idxLf;
        terminador = "\n";
      }

      if (idx < 0 || !terminador) break;

      const linea = buffer.slice(0, idx);
      let siguiente = idx + 1;
      if (terminador === "\r" && buffer[siguiente] === "\n") {
        siguiente += 1;
      }
      buffer = buffer.slice(siguiente);
      controller.enqueue(linea);
    }
  }

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk;
      emitCompletas(controller);
    },
    flush() {
      buffer = "";
    }
  });
}
