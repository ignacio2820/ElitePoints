"use client";

import { Fingerprint } from "lucide-react";
import { RegistrarPasskeyButton } from "@/components/auth/RegistrarPasskeyButton";

export function MiCuentaPasskeyCard() {
  if (process.env.NEXT_PUBLIC_WEBAUTHN_ENABLED !== "true") {
    return null;
  }

  return (
    <section className="surface-card rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-terracotta-50 text-terracotta-500">
          <Fingerprint size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold text-bark-700">
            Acceso rápido
          </h2>
          <p className="mt-1 text-sm text-bark-500">
            Activá huella o passkey en este celular para entrar sin esperar el
            email del magic link.
          </p>
          <div className="mt-3">
            <RegistrarPasskeyButton />
          </div>
        </div>
      </div>
    </section>
  );
}
