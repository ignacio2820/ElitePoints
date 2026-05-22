"use client";

import { Loader2, Lock, MessageCircleWarning } from "lucide-react";
import Link from "next/link";

const WHATSAPP_SOPORTE = "543446536509";

function urlWhatsAppSoporte(): string {
  const texto = encodeURIComponent(
    "Hola, quiero registrar mi Pet Shop o Veterinaria en MascotPoints. Necesito mi enlace de activación."
  );
  return `https://wa.me/${WHATSAPP_SOPORTE}?text=${texto}`;
}

export function OnboardingValidando() {
  return (
    <div className="paw-bg flex min-h-screen items-center justify-center px-6">
      <div className="flex flex-col items-center gap-3 text-bark-600">
        <Loader2 className="h-8 w-8 animate-spin text-[#fb8500]" aria-hidden />
        <p className="text-sm font-medium">Verificando enlace de activación…</p>
      </div>
    </div>
  );
}

export function OnboardingAccesoRestringido({
  tipo
}: {
  tipo: "sin-token" | "token-invalido";
}) {
  const esSinToken = tipo === "sin-token";

  return (
    <div className="paw-bg flex min-h-screen items-center justify-center px-6 py-12">
      <div className="surface-card w-full max-w-lg p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-800 ring-1 ring-amber-200">
          {esSinToken ? <Lock size={30} /> : <MessageCircleWarning size={30} />}
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold text-bark-700 sm:text-3xl">
          Acceso restringido
        </h1>
        {esSinToken ? (
          <p className="mt-4 text-sm leading-relaxed text-bark-600">
            Para registrar tu Pet Shop o Veterinaria en MascotPoints es necesario
            adquirir una membresía. Contactá a soporte para recibir tu enlace de
            activación personalizado.
          </p>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-bark-600">
            El enlace de activación ha expirado o ya fue utilizado.
          </p>
        )}
        <a
          href={urlWhatsAppSoporte()}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mx-auto mt-8 inline-flex justify-center gap-2"
        >
          Contactar por WhatsApp
        </a>
        <p className="mt-6 text-xs text-bark-400">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-bark-700 underline underline-offset-2"
          >
            Ingresar al panel
          </Link>
        </p>
      </div>
    </div>
  );
}
