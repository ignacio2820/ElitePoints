import { redirect } from "next/navigation";

/**
 * Compatibilidad con QR impresos que apuntaban a /acceso.
 * Los clientes deben ir directo al formulario de registro del local.
 */
export default function AccesoLegacyRedirect({
  searchParams
}: {
  searchParams: { localId?: string; ref?: string };
}) {
  const localId = searchParams.localId?.trim();
  if (!localId) {
    redirect("/");
  }
  const qs = new URLSearchParams({ localId });
  const ref = searchParams.ref?.trim();
  if (ref) qs.set("ref", ref);
  redirect(`/registro?${qs.toString()}`);
}
