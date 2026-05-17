"use client";

import { useState } from "react";
import { AlertCircle, Loader2, UserPlus, X } from "lucide-react";
import { Field, TextInput } from "@/components/ui/Field";
import { verificarEmailDuplicadoAdmin } from "@/app/actions/clientes";
import {
  CODIGO_ERROR_EMAIL_DUPLICADO,
  MENSAJE_EMAIL_DUPLICADO_ADMIN
} from "@/lib/huellitas/emailCliente.constants";

interface Props {
  onClose: () => void;
  onCreado: (clienteId: string) => void;
}

export function AltaClienteModal({ onClose, onCreado }: Props) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toastDuplicado, setToastDuplicado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setToastDuplicado(false);

    const nombreTrim = nombre.trim();
    if (nombreTrim.length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }

    const emailNorm = email.trim().toLowerCase();

    setGuardando(true);
    try {
      if (emailNorm) {
        const existe = await verificarEmailDuplicadoAdmin(emailNorm);
        if (existe) {
          setToastDuplicado(true);
          return;
        }
      }

      const r = await fetch("/api/admin/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          nombre: nombreTrim,
          email: emailNorm || undefined,
          telefono: telefono.trim() || undefined
        })
      });

      const data = (await r.json()) as {
        ok: boolean;
        error?: string;
        message?: string;
        clienteId?: string;
      };

      if (!r.ok || !data.ok || !data.clienteId) {
        if (r.status === 400 && data.error === CODIGO_ERROR_EMAIL_DUPLICADO) {
          setToastDuplicado(true);
          return;
        }
        const msg = data.message ?? data.error ?? "No pudimos crear el cliente.";
        setError(msg);
        return;
      }

      onCreado(data.clienteId);
      onClose();
    } catch {
      setError("Error de red. Intentá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bark-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alta-cliente-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-bark-100">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2
              id="alta-cliente-titulo"
              className="font-display text-xl font-semibold text-bark-700"
            >
              Nuevo cliente
            </h2>
            <p className="mt-1 text-sm text-bark-500">
              El email no puede repetirse entre clientes de tu local.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-bark-400 hover:bg-cream-100"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {toastDuplicado ? (
          <div
            className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            role="alert"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />
            <p className="font-medium">{MENSAJE_EMAIL_DUPLICADO_ADMIN}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre">
            <TextInput
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Lucía Romero"
              autoFocus
              required
            />
          </Field>

          <Field label="Email" hint="Opcional. Debe ser único en tu local si lo completás.">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setToastDuplicado(false);
              }}
              placeholder="lucia@ejemplo.com"
              aria-invalid={toastDuplicado}
            />
          </Field>

          <Field label="Teléfono" hint="Opcional.">
            <TextInput
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+54 9 ..."
            />
          </Field>

          {error ? (
            <div className="rounded-xl bg-terracotta-50 px-4 py-2 text-sm text-terracotta-500">
              {error}
            </div>
          ) : null}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1 justify-center"
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="btn-primary inline-flex flex-1 items-center justify-center gap-2"
            >
              {guardando ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              {guardando ? "Guardando…" : "Crear cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
