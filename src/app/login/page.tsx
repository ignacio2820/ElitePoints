import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Ingresar — Huellitas"
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bark-600 text-bark-100">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
