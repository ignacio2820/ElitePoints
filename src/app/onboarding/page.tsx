import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RUTA_DASHBOARD, RUTA_PORTAL } from "@/lib/auth/redirect";
import { getSesion } from "@/lib/auth/server";
import { OnboardingValidando } from "./OnboardingAcceso";
import { OnboardingForm } from "./OnboardingForm";

export const dynamic = "force-dynamic";

/**
 * /onboarding — Registro de un nuevo Pet Shop.
 *
 * Si el visitante ya está logueado como admin de algún local, lo mandamos
 * a su panel. Si está logueado como cliente, también lo redirigimos: este
 * flujo es solo para dueños que quieren abrir tienda nueva.
 */
export default async function OnboardingPage() {
  const sesion = await getSesion();
  if (sesion) {
    if (sesion.claims.role === "admin") redirect(RUTA_DASHBOARD);
    if (sesion.claims.role === "cliente") {
      redirect(RUTA_PORTAL);
    }
  }
  return (
    <Suspense fallback={<OnboardingValidando />}>
      <OnboardingForm />
    </Suspense>
  );
}
