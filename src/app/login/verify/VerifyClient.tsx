"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Mail, Sparkles } from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { completarLogin } from "@/lib/auth/client";

type Estado = "verificando" | "ok" | "error" | "needs-email";

export function VerifyClient() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("verificando");
  const [mensaje, setMensaje] = useState<string>("");
  const [emailInput, setEmailInput] = useState<string>("");

  async function intentar(emailExplicito?: string) {
    setEstado("verificando");
    setMensaje("");
    const result = await completarLogin(window.location.href, emailExplicito);
    if (result.ok) {
      setEstado("ok");
      const dest = result.redirectTo ?? "/";
      setTimeout(() => router.replace(dest), 600);
    } else if (result.needsEmail) {
      setEstado("needs-email");
    } else {
      setEstado("error");
      setMensaje(result.error ?? "Error desconocido");
    }
  }

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (cancelado) return;
      await intentar();
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="paw-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-terracotta-400 shadow-soft">
            <HuellitaIcon size={32} className="text-white" />
          </div>
        </div>

        <div className="surface-card rounded-3xl p-6 sm:p-8">
        {estado === "verificando" && (
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-bark-500" />
            <h1 className="mt-4 font-display text-2xl font-semibold text-bark-700">
              Verificando tu acceso…
            </h1>
            <p className="mt-2 text-sm text-bark-500">
              No cierres esta ventana, ya casi estamos.
            </p>
          </div>
        )}

        {estado === "ok" && (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Sparkles size={24} />
            </div>
            <h1 className="mt-4 font-display text-2xl font-semibold text-bark-700">
              ¡Bienvenido!
            </h1>
            <p className="mt-2 text-sm text-bark-500">Te llevamos al panel…</p>
          </div>
        )}

        {estado === "needs-email" && (
          <form
            className="mt-6 text-left"
            onSubmit={(e) => {
              e.preventDefault();
              if (!emailInput.trim()) return;
              void intentar(emailInput.trim().toLowerCase());
            }}
          >
            <h1 className="text-center font-display text-2xl font-semibold text-bark-700">
              Confirmá tu email
            </h1>
            <p className="mt-2 text-center text-sm text-bark-500">
              Por seguridad, Firebase necesita que confirmes el email al que
              llegó este link mágico (sobre todo si lo abriste en otro
              navegador).
            </p>
            <label className="mt-5 block">
              <span className="text-xs font-semibold uppercase tracking-widest text-bark-500">
                Email
              </span>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-bark-100 bg-white px-3 py-3 transition focus-within:border-bark-400 focus-within:ring-2 focus-within:ring-bark-300/30">
                <Mail size={16} className="text-bark-400" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="tu@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-transparent text-base text-bark-700 outline-none placeholder:text-bark-300"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={!emailInput.trim()}
              className="btn-primary mt-5 w-full justify-center disabled:opacity-50"
            >
              Confirmar y entrar
            </button>
          </form>
        )}

        {estado === "error" && (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <AlertTriangle size={24} />
            </div>
            <h1 className="mt-4 font-display text-2xl font-semibold text-bark-700">
              No pudimos completar el ingreso
            </h1>
            <p className="mt-2 text-sm text-rose-600">{mensaje}</p>
            <a href="/login" className="btn-primary mt-6 inline-flex">
              Reintentar
            </a>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
