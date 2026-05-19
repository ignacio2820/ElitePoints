import { esCodigoClienteValido } from "@/lib/huellitas/codigosClientes";
import { esEntradaIdentificadorBarras } from "@/lib/huellitas/identificadorBarras";
import type { ClienteResumen } from "@/lib/huellitas/clientesService";
import { extraerClienteIdDesdeQr } from "@/lib/huellitas/parseClienteQr";

/**
 * Convierte una línea del lector RS-232 / QR en pantalla al ID Firestore del cliente.
 */
export async function resolverClienteIdDesdeLector(
  lineaCruda: string
): Promise<string | null> {
  const linea = lineaCruda.trim();
  if (!linea) return null;

  const desdeQr = extraerClienteIdDesdeQr(linea);
  if (desdeQr) return desdeQr;

  if (esCodigoClienteValido(linea) || esEntradaIdentificadorBarras(linea)) {
    try {
      const r = await fetch(
        `/api/admin/clientes/lookup?q=${encodeURIComponent(linea)}`,
        { cache: "no-store", credentials: "same-origin" }
      );
      const data = (await r.json()) as {
        ok?: boolean;
        cliente?: ClienteResumen;
      };
      if (data.ok && data.cliente?.id) return data.cliente.id;
    } catch {
      return null;
    }
  }

  return null;
}
