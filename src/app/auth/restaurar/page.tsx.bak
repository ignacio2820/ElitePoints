import { Suspense } from "react";
import { RestaurarSesionClient } from "./RestaurarSesionClient";

export const metadata = {
  title: "Restaurando sesión — Huellitas"
};

export default function RestaurarSesionPage() {
  return (
    <Suspense
      fallback={
        <div className="paw-bg flex min-h-screen items-center justify-center px-4">
          <p className="text-sm text-bark-500">Preparando tu acceso…</p>
        </div>
      }
    >
      <RestaurarSesionClient />
    </Suspense>
  );
}
