import { esCodigoClienteValido } from "./codigosClientes";
import {
  esEntradaIdentificadorBarras,
  esSufijoIdFirebaseBarras,
  pareceIdDocumentoFirestore
} from "./identificadorBarras";
import { extraerClienteIdDesdeQr } from "./parseClienteQr";

/** Indica si la entrada debe ir al lookup rápido en caja (escáner / código / ID). */
export function esEntradaEscannerRapida(entrada: string): boolean {
  const q = entrada.trim();
  if (!q) return false;
  if (esCodigoClienteValido(q)) return true;
  if (extraerClienteIdDesdeQr(q)) return true;
  if (esSufijoIdFirebaseBarras(q)) return true;
  if (pareceIdDocumentoFirestore(q)) return true;
  if (esEntradaIdentificadorBarras(q)) return true;
  return false;
}
