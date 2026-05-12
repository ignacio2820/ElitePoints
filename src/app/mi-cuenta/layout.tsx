import { redirect } from "next/navigation";
import { MascotPointsFooter } from "@/components/MascotPointsFooter";
import { getSesion } from "@/lib/auth/server";
import { loginClienteRedirect } from "@/lib/huellitas/tenant";

export const dynamic = "force-dynamic";

export default async function MiCuentaLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const sesion = await getSesion();
  if (!sesion) {
    redirect(loginClienteRedirect("/mi-cuenta"));
  }
  if (sesion.claims.role !== "cliente" || !sesion.claims.clienteId) {
    redirect("/admin");
  }
  return (
    <div className="paw-bg flex min-h-screen flex-col">
      <div className="flex-1">{children}</div>
      <MascotPointsFooter className="print:hidden" />
    </div>
  );
}
