import { redirect } from "next/navigation";
import { getInfoLocal } from "./localService";
import { tieneAccesoOperativo } from "./membresia";

export const RUTA_PAGOS_ADMIN = "/admin/pagos";

const RUTAS_OPERATIVAS_ADMIN = ["/admin/nueva-venta", "/admin/clientes"] as const;

export function rutaRequiereAccesoOperativo(pathname: string): boolean {
  return RUTAS_OPERATIVAS_ADMIN.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)
  );
}

export async function requireMembresiaActiva(localId: string): Promise<void> {
  const info = await getInfoLocal(localId);
  if (!tieneAccesoOperativo(info)) {
    redirect(RUTA_PAGOS_ADMIN);
  }
}

export async function assertAccesoOperativo(localId: string): Promise<void> {
  const info = await getInfoLocal(localId);
  if (!tieneAccesoOperativo(info)) {
    throw new Error("MEMBRESIA_REQUERIDA");
  }
}
