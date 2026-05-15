"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { ingresarConPassword } from "@/lib/auth/client";

interface Props {
  email: string;
  redirect?: string;
  tienePassword?: boolean;
  onError: (msg: string) => void;
  disabled?: boolean;
}

export function LoginPasswordDueno({
  email,
  redirect,
  tienePassword,
  onError,
  disabled
}: Props) {
  const [password, setPassword] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  if (!mostrar) {
    return (
      <button
        type="button"
        disabled={disabled || !email.trim()}
        onClick={() => {
          onError("");
          setMostrar(true);
        }}
        className="btn-ghost inline-flex w-full items-center justify-center gap-2 text-sm"
      >
        <KeyRound size={16} />
        Ingresar con contraseña
      </button>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || enviando) return;
    setEnviando(true);
    onError("");
    const res = await ingresarConPassword({
      email: email.trim(),
      password,
      redirect
    });
    setEnviando(false);
    if (!res.ok) {
      onError(res.error ?? "No pudimos iniciar sesión.");
      return;
    }
    window.location.href = res.redirectTo ?? "/admin";
  }

  return (
    <div className="space-y-3 rounded-xl border border-bark-100 bg-cream-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-bark-500">
        Acceso de dueño con contraseña
      </p>
      {!tienePassword ? (
        <p className="text-xs leading-relaxed text-bark-600">
          Si aún no configuraste una contraseña, entrá una vez con el link mágico
          y definila en Configuración → Seguridad de acceso.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm font-medium text-bark-700">
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-elegant mt-1 w-full"
            placeholder="Tu contraseña"
            required
            minLength={8}
          />
        </label>
        <button
          type="submit"
          disabled={enviando || !password}
          className="btn-primary inline-flex w-full items-center justify-center gap-2"
        >
          {enviando ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Ingresando…
            </>
          ) : (
            <>
              <KeyRound size={16} />
              Entrar al panel
            </>
          )}
        </button>
        <button
          type="button"
          className="w-full text-center text-xs text-bark-500 hover:text-bark-700"
          onClick={() => {
            setMostrar(false);
            setPassword("");
          }}
        >
          Volver al link mágico
        </button>
      </form>
    </div>
  );
}
