import { Suspense } from "react";
import { VerifyClient } from "./VerifyClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verificando — Huellitas"
};

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyClient />
    </Suspense>
  );
}
