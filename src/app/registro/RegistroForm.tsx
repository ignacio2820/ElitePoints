"use client";

import { useState, useTransition } from "react";
import { Check, UserPlus } from "lucide-react";
import { Field, TextInput } from "@/components/ui/Field";
import { esCodigoValido, normalizarCodigo } from "@/lib/huellitas/referidos";
import { verificarEmailDuplicado } from "@/app/actions/clientes";
import {
  CODIGO_ERROR_EMAIL_DUPLICADO,
  MENSAJE_EMAIL_DUPLICADO_EN_LOCAL
} from "@/lib/huellitas/emailCliente.constants";

export interface RegistroFormProps {
  localId: string;
  codigoReferido?: string;
  bonusBienvenida: number;
  referidosActivos: boolean;
}

export function RegistroForm({
  localId,
  codigoReferido,
  bonusBienvenida,
  referidosActivos
}: RegistroFormProps) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [codigo, setCodigo] = useState(codigoReferido ?? "");
  const [error, setError] = useState<string | null>(null);
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ codigo: string; clienteId: string } | null>(null);

  const submit = () => {
    setError(null);
    setErrorEmail(null);
    if (!nombre.trim() || nombre.trim().length < 2) {
      setError("Decinos cómo te llamás");
      return;
    }
    if (codigo && !esCodigoValido(normalizarCodigo(codigo))) {
      setError("El código del amigo no parece válido");
      return;
    }
    start(async () => {
      try {
        const emailNorm = email.trim().toLowerCase();
        if (emailNorm) {
          const existe = await verificarEmailDuplicado(emailNorm, localId);
          if (existe) {
            setErrorEmail(MENSAJE_EMAIL_DUPLICADO_EN_LOCAL);
            return;
          }
        }

        const res = await fetch("/api/clientes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            localId,
            nombre: nombre.trim(),
            email: emailNorm || undefined,
            telefono: telefono.trim() || undefined,
            codigoReferido: codigo ? normalizarCodigo(codigo) : undefined
          })
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          message?: string;
          codigoReferido?: string;
          clienteId?: string;
        };
        if (!res.ok || !data.ok) {
          if (res.status === 400 && data.error === CODIGO_ERROR_EMAIL_DUPLICADO) {
            setErrorEmail(
              data.message ??
                "Este correo electrónico ya está registrado en este local."
            );
            return;
          }
          throw new Error(data.message ?? data.error ?? "No pudimos crear tu cuenta");
        }
        if (!data.codigoReferido || !data.clienteId) {
          throw new Error("Respuesta incompleta del servidor.");
        }
        setDone({ codigo: data.codigoReferido, clienteId: data.clienteId });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      }
    });
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-sage-50 ring-1 ring-sage-200 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white ring-1 ring-sage-200">
          <Check size={20} className="text-sage-300" />
        </div>
        <h3 className="mt-4 font-display text-2xl font-semibold text-bark-700">
          ¡Listo, {nombre.split(" ")[0]}!
        </h3>
        <p className="mt-2 text-sm text-bark-500">
          Tu cuenta quedó creada. Acercate al local con esta confirmación y, en
          tu primera compra, vas a recibir{" "}
          <strong className="text-bark-700">{bonusBienvenida} huellitas</strong>{" "}
          de bienvenida.
        </p>
        <div className="mt-5 inline-block rounded-xl bg-white px-4 py-3 ring-1 ring-bark-100">
          <div className="text-[10px] uppercase tracking-widest text-bark-400">
            Tu código personal
          </div>
          <code className="mt-1 block font-display text-2xl tracking-[0.18em] text-bark-700">
            {done.codigo}
          </code>
        </div>
        <p className="mt-4 text-xs text-[color:var(--muted)]">
          Compartilo con amigos y sumá más huellitas cuando ellos visiten el local.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tu nombre">
          <TextInput
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Lucía Romero"
            autoFocus
          />
        </Field>
        <Field label="Email" hint="Opcional, para mandarte saludos y promos.">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrorEmail(null);
            }}
            placeholder="lucia@ejemplo.com"
            aria-invalid={!!errorEmail}
          />
          {errorEmail ? (
            <p className="mt-1.5 text-sm text-terracotta-500" role="alert">
              {errorEmail}
            </p>
          ) : null}
        </Field>
        <Field label="Teléfono" hint="Opcional.">
          <TextInput
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+54 9 ..."
          />
        </Field>
        {referidosActivos ? (
          <Field
            label="Código de referido"
            hint={
              codigoReferido
                ? "Te lo precargamos con el del amigo que te invitó."
                : "Si un amigo te recomendó, pegá su código."
            }
          >
            <TextInput
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="LUC-K3MP"
              spellCheck={false}
            />
          </Field>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl bg-terracotta-50 px-4 py-2 text-sm text-terracotta-500">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={pending}
          className="btn-primary inline-flex items-center gap-2"
        >
          <UserPlus size={16} />
          {pending ? "Creando cuenta…" : "Crear mi cuenta"}
        </button>
      </div>
    </div>
  );
}
