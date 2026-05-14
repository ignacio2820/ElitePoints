import { notFound, redirect } from "next/navigation";
import { getSesion } from "@/lib/auth/server";
import { loginClienteRedirect } from "@/lib/huellitas/tenant";

/**
 * Rutas públicas con `?localId=` solo para demo de marketing.
 * Un cliente real debe estar autenticado y coincidir con claims (mismo local y mismo id).
 */
export async function requiereAccesoClientePublico(
  localId: string,
  clienteId: string
): Promise<void> {
  if (clienteId === "demo") return;

  const sesion = await getSesion();
  if (!sesion) {
    redirect(loginClienteRedirect(`/cliente/${clienteId}`, localId));
  }
  if (sesion.claims.role !== "cliente" || !sesion.claims.clienteId) {
    notFound();
  }
  if (sesion.claims.clienteId !== clienteId || sesion.claims.localId !== localId) {
    redirect("/mi-cuenta");
  }
}
