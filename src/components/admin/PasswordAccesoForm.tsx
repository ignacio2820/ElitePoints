"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2, Save } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { actualizarContraseñaDesdeCliente } from "@/lib/auth/password.client";
import { sincronizarSesionConFirebase } from "@/lib/auth/client";

export function PasswordAccesoForm() {
  const [tienePassword, setTienePassword] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [contraseñaActual, setContraseñaActual] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/auth/password", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: { ok: boolean; tienePassword?: boolean }) => {
        if (d.ok) setTienePassword(d.tienePassword === true);
      })
      .catch(() => setTienePassword(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guardando) return;

    setGuardando(true);
    setError(null);
    setOkMsg(null);

    try {
      const resultado = await actualizarContraseñaDesdeCliente({
        nuevaPassword: password,
        confirmarPassword: confirmar,
        contraseñaActual: contraseñaActual.trim() || undefined
      });

      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      const eraCambio = tienePassword === true;
      await sincronizarSesionConFirebase(undefined);
      setTienePassword(true);
      setOkMsg(
        eraCambio
          ? "Contraseña actualizada en Firebase Auth. Ya podés entrar con email y esta clave."
          : "Contraseña creada. Ya podés entrar con email y contraseña (además del link mágico)."
      );
      setPassword("");
      setConfirmar("");
      setContraseñaActual("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-terracotta-500">
          <KeyRound size={16} />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
            Seguridad de acceso
          </span>
        </div>
        <CardTitle className="mt-2 text-xl font-bold text-bark-700">
          {tienePassword ? "Cambiar contraseña" : "Establecer contraseña"}
        </CardTitle>
        <CardDescription className="text-bark-600">
          La clave se guarda en Firebase Authentication con el método oficial{" "}
          <code className="text-xs">updatePassword</code>, la misma que usa el
          login con email. Si ya tenés contraseña, completá la actual cuando
          Firebase lo pida.
        </CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-bark-700">
          Contraseña actual
          <input
            type="password"
            autoComplete="current-password"
            value={contraseñaActual}
            onChange={(e) => setContraseñaActual(e.target.value)}
            className="input-elegant mt-1 w-full"
            placeholder={
              tienePassword
                ? "Requerida si Firebase pide confirmar identidad"
                : "Solo si ya tenías contraseña"
            }
            maxLength={128}
          />
        </label>

        <label className="block text-sm font-medium text-bark-700">
          {tienePassword ? "Nueva contraseña" : "Contraseña"}
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-elegant mt-1 w-full"
            required
            minLength={8}
            maxLength={128}
          />
        </label>
        <label className="block text-sm font-medium text-bark-700">
          Repetir contraseña
          <input
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className="input-elegant mt-1 w-full"
            required
            minLength={8}
            maxLength={128}
          />
        </label>

        {error ? (
          <p
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {okMsg ? (
          <p
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            role="status"
          >
            {okMsg}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={guardando}
          className="btn-primary inline-flex items-center gap-2"
        >
          {guardando ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Guardando…
            </>
          ) : (
            <>
              <Save size={16} />
              {tienePassword ? "Actualizar contraseña" : "Establecer contraseña"}
            </>
          )}
        </button>
      </form>
    </Card>
  );
}
