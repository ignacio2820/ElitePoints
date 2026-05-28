import { Suspense } from "react";
import { VerifyClient } from "./VerifyClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verificando — Puntos"
};

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyClient />
    </Suspense>
  );
}
