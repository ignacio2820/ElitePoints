import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Ingresar — Huellitas"
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-bark-500">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
