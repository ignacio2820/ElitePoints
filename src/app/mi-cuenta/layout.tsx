import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function MiCuentaLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const sesion = await getSesion();
  if (!sesion) {
    redirect("/login?intent=cliente&redirect=/mi-cuenta");
  }
  if (sesion.claims.role !== "cliente" || !sesion.claims.clienteId) {
    redirect("/admin");
  }
  return <>{children}</>;
}
