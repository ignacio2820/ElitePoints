"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PuntoIcon } from "@/components/PuntoIcon";
import { restaurarSesionDesdeFirebase } from "@/lib/auth/client";
import { RUTA_PORTAL } from "@/lib/auth/redirect";

/**
 * Re-emite la session cookie httpOnly desde Firebase Auth local (IndexedDB).
 * El middleware envía acá cuando falta cookie pero el cliente abrió /portal en PWA.
 */
export function RestaurarSesionClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const intentado = useRef(false);

  useEffect(() => {
    if (intentado.current) return;
    intentado.current = true;

    const redirect = sp.get("redirect")?.trim() || RUTA_PORTAL;

    void (async () => {
      const res = await restaurarSesionDesdeFirebase(redirect);
      if (res.ok) {
        router.replace(res.redirectTo ?? redirect);
        return;
      }

      const params = new URLSearchParams({ redirect });
      router.replace(`/login?${params.toString()}`);
    })();
  }, [router, sp]);

  return (
    <div className="paw-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta-400 shadow-soft">
          <PuntoIcon size={28} className="text-white" />
        </div>
        <Loader2 className="mx-auto mt-6 h-8 w-8 animate-spin text-white" />
        <h1 className="mt-4 font-display text-xl font-semibold text-white">
          Restaurando tu sesión…
        </h1>
        <p className="mt-2 text-sm text-white">
          Un momento, estamos recuperando tu acceso sin pedirte un nuevo link.
        </p>
      </div>
    </div>
  );
}
