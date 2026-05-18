import { redirect } from "next/navigation";
import { MascotPointsFooter } from "@/components/MascotPointsFooter";
import { InstalarAppBanner } from "@/components/pwa/InstalarAppBanner";
import { getSesion } from "@/lib/auth/server";
import { RUTA_DASHBOARD, RUTA_PORTAL } from "@/lib/auth/redirect";
import { loginClienteRedirect } from "@/lib/huellitas/tenant";

export const dynamic = "force-dynamic";

export default async function MiCuentaLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const sesion = await getSesion();
  if (!sesion) {
    redirect(loginClienteRedirect(RUTA_PORTAL));
  }
  if (sesion.claims.role !== "cliente" || !sesion.claims.clienteId) {
    redirect(RUTA_DASHBOARD);
  }
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-lg px-4 pt-4 print:hidden">
        <InstalarAppBanner />
      </div>
      <div className="flex-1">{children}</div>
      <MascotPointsFooter variant="onDark" className="print:hidden" />
    </div>
  );
}
