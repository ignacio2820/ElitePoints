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
    void fetch("/api/auth/password")
      .then((r) => r.json())
      .then((d: { ok: boolean; tienePassword?: boolean }) => {
        if (d.ok) setTienePassword(d.tienePassword === true);
      })
      .catch(() => setTienePassword(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    setOkMsg(null);

    const pTrim = password.trim();
    const cTrim = confirmar.trim();

    async function aplicarPasswordPorApiServidor(): Promise<
      | { ok: true }
      | { ok: false; error: string }
    > {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password: pTrim, confirmar: cTrim })
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        return {
          ok: false,
          error: data.error ?? `Error ${res.status}`
        };
      }
      return { ok: true };
    }

    try {
      const resultado = await actualizarContraseñaDesdeCliente({
        nuevaPassword: password,
        confirmarPassword: confirmar,
        contraseñaActual: contraseñaActual.trim() ? contraseñaActual : undefined
      });

      if (!resultado.ok) {
        if (resultado.codigoFirebase === "auth/no-current-user-web") {
          const adm = await aplicarPasswordPorApiServidor();
          if (!adm.ok) {
            setError(
              `${resultado.error} Además probamos aplicar desde el servidor: ${adm.error}`
            );
            return;
          }
          setTienePassword(true);
          setOkMsg(
            "Contraseña guardada en Firebase (vía servidor). Cerrá sesión y entrá de nuevo con tu email y esta clave para comprobarlo."
          );
          setPassword("");
          setConfirmar("");
          setContraseñaActual("");
          return;
        }
        setError(resultado.error);
        return;
      }

      const mirror = await aplicarPasswordPorApiServidor();
      if (!mirror.ok) {
        console.warn("[PasswordAccesoForm] cliente OK pero Admin mirror falló:", mirror.error);
      }

      const antesTeniaPassword = tienePassword === true;
      const sync = await sincronizarSesionConFirebase(undefined);
      setTienePassword(true);

      if (!sync.ok) {
        setOkMsg(
          mirror.ok
            ? "Contraseña actualizada en Firebase Auth. La cookie del panel no se pudo refrescar en este momento; cerrá sesión y entrá de nuevo si algo no coincide."
            : `Contraseña actualizada en Firebase Auth (${mirror.error}). Tu sesión puede quedar sólo válida hasta que cierres e ingreses de nuevo.`
        );
      } else if (antesTeniaPassword) {
        setOkMsg(
          mirror.ok
            ? "Contraseña actualizada. Ya podés cerrar sesión y volver a entrar con esta clave y tu email."
            : `Contraseña actualizada desde el navegador. Si el siguiente login fallara, esperá unos segundos o cerrá sesión y probá otra vez. (${mirror.error})`
        );
      } else {
        setOkMsg(
          mirror.ok
            ? "Contraseña creada. Ya podés ingresar con email y contraseña."
            : `Contraseña creada desde el navegador. Si no podés entrar, esperá brevemente o repetí desde Configuración. (${mirror.error})`
        );
      }

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
          Actualizamos la clave directamente en Firebase Auth (SDK web): es la misma credencial que se usa para el login.
          Podés combinar con el link mágico cuando quieras. Mínimo 8 caracteres.
        </CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        {tienePassword ? (
          <label className="block text-sm font-medium text-bark-700">
            Contraseña actual
            <input
              type="password"
              autoComplete="current-password"
              value={contraseñaActual}
              onChange={(e) => setContraseñaActual(e.target.value)}
              className="input-elegant mt-1 w-full"
              placeholder="Opcional si acabás de ingresar; obligatoria si Firebase pide reautenticación"
              maxLength={128}
            />
            <span className="mt-1 block text-xs font-normal text-bark-400">
              Si aparece que debés confirmar tu identidad o que hace mucho que iniciaste sesión, completá este campo antes de guardar de nuevo (Firebase usa esto sólo como verificación para cambiar credenciales, no como contraseña de respaldo en base de datos).
            </span>
          </label>
        ) : null}

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
