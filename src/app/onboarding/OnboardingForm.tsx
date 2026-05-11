"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ImageIcon,
  Mail,
  PartyPopper,
  Phone,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { nombreASlug } from "@/lib/huellitas/slug";
import { registrarPetShop, type OnboardingState } from "./actions";

/**
 * Formulario de onboarding del Pet Shop.
 *
 * Diseño dividido en dos paneles:
 *  - Izquierda: branding + beneficios (oculto en móvil).
 *  - Derecha: formulario en una columna con preview del slug en vivo.
 */

const initialState: OnboardingState = { status: "idle" };

export function OnboardingForm() {
  const [state, formAction] = useFormState(registrarPetShop, initialState);

  if (state.status === "ok") {
    return <ExitoPanel state={state} />;
  }

  return <Formulario errorMsg={state.status === "error" ? state.error : null} formAction={formAction} />;
}

function Formulario({
  errorMsg,
  formAction
}: {
  errorMsg: string | null;
  formAction: (fd: FormData) => void;
}) {
  const [nombreLocal, setNombreLocal] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const slugPreview = useMemo(() => nombreASlug(nombreLocal), [nombreLocal]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-zinc-100 lg:flex-row">
      {/* Panel izquierdo: branding (solo desktop) */}
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-amber-400/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-amber-300/5 blur-3xl"
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
            <Sparkles size={12} /> Onboarding · Dueños
          </div>
          <h1 className="mt-6 max-w-md font-display text-4xl font-semibold leading-tight text-amber-50 xl:text-5xl">
            Tu Pet Shop con un programa de fidelidad de verdad.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
            En 60 segundos creás tu cuenta, tu sistema de Huellitas y empezás
            a sumar clientes recurrentes. Sin tarjetas de plástico, sin Excel.
          </p>
        </div>

        <ul className="relative mt-10 space-y-4 text-sm">
          <Beneficio
            icon={<ShieldCheck size={16} />}
            titulo="Costo del programa: 1%"
            sub="Por defecto: $1.000 = 1 Huellita. 1 Huellita = $10. Tu margen queda intacto."
          />
          <Beneficio
            icon={<PartyPopper size={16} />}
            titulo="Niveles + cumpleaños listos"
            sub="Cachorro, Explorador, Gran Guardián. Saludos automáticos a las mascotas."
          />
          <Beneficio
            icon={<HuellitaIconMini />}
            titulo="App lista para tus clientes"
            sub="Cada cliente tiene su panel mobile-first y un código corto para la caja."
          />
        </ul>

        <p className="relative mt-10 text-xs text-zinc-500">
          ¿Ya sos dueño de un Pet Shop con cuenta? Volvé a la{" "}
          <a href="/login" className="text-amber-300 underline underline-offset-2">
            pantalla de ingreso
          </a>
          .
        </p>
      </aside>

      {/* Panel derecho: formulario */}
      <main className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
              <Sparkles size={12} /> Onboarding · Dueños
            </div>
            <h1 className="mt-4 font-display text-3xl font-semibold text-amber-50">
              Crear tu Pet Shop
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Un programa de fidelidad listo en 60 segundos.
            </p>
          </div>

          <form action={formAction} className="mt-8 space-y-5">
            <Field
              label="Nombre del Pet Shop"
              hint={
                slugPreview
                  ? `Tu URL: tuapp.com/${slugPreview}`
                  : "Ej: el nombre con el que tus clientes te conocen"
              }
              icon={<Building2 size={16} />}
            >
              <input
                ref={inputRef}
                type="text"
                name="nombreLocal"
                value={nombreLocal}
                onChange={(e) => setNombreLocal(e.target.value)}
                placeholder="Mi Pet Shop"
                required
                minLength={2}
                maxLength={80}
                autoComplete="organization"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </Field>

            <Field
              label="Email del dueño"
              hint="Te mandamos un link mágico para entrar al panel."
              icon={<Mail size={16} />}
            >
              <input
                type="email"
                name="email"
                placeholder="hola@tupetshop.com"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </Field>

            <Field
              label="Teléfono / WhatsApp"
              hint="Para que tus clientes te consulten desde su Mi Cuenta. Opcional."
              icon={<Phone size={16} />}
            >
              <input
                type="tel"
                name="telefonoWhatsapp"
                placeholder="+54 9 11 0000-0000"
                maxLength={30}
                autoComplete="tel"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </Field>

            <Field
              label="Logo (URL)"
              hint="Pegá un link a tu logo. Lo podés cambiar después. Opcional."
              icon={<ImageIcon size={16} />}
            >
              <div className="flex items-center gap-3">
                <input
                  type="url"
                  name="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  maxLength={500}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                />
                {logoUrl && /^https?:\/\//.test(logoUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Vista previa del logo"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                    className="h-12 w-12 shrink-0 rounded-xl border border-zinc-800 bg-zinc-900 object-cover"
                  />
                )}
              </div>
            </Field>

            {errorMsg && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
                {errorMsg}
              </div>
            )}

            <BotonEnviar />

            <p className="text-center text-xs leading-relaxed text-zinc-500">
              Al continuar aceptás recibir el email con el link de acceso al
              panel. Sin contraseñas. El link expira en 1 hora.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

function BotonEnviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 py-3.5 text-sm font-bold text-zinc-900 shadow-[0_8px_24px_-8px_rgba(251,191,36,0.6)] transition hover:shadow-[0_12px_32px_-8px_rgba(251,191,36,0.7)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {pending ? (
          <>
            <Spinner /> Creando tu Pet Shop...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Crear mi Pet Shop
            <ArrowRight size={16} />
          </>
        )}
      </span>
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
    </button>
  );
}

function Field({
  label,
  hint,
  icon,
  children
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {icon && <span className="text-amber-300/80">{icon}</span>}
        {label}
      </span>
      {children}
      {hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
    </label>
  );
}

function Beneficio({
  icon,
  titulo,
  sub
}: {
  icon: React.ReactNode;
  titulo: string;
  sub: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-300">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-amber-50">{titulo}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{sub}</p>
      </div>
    </li>
  );
}

function HuellitaIconMini() {
  return <HuellitaIcon size={16} />;
}

function ExitoPanel({
  state
}: {
  state: Extract<OnboardingState, { status: "ok" }>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-black px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30">
          <CheckCircle2 size={32} />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold text-amber-50">
          ¡Tu Pet Shop está listo!
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Creamos tu local con el identificador{" "}
          <code className="rounded bg-zinc-900 px-2 py-0.5 font-mono text-amber-300">
            {state.localId}
          </code>{" "}
          y configuramos tu programa de fidelidad con valores saludables (1%
          de costo).
        </p>

        {state.sent ? (
          <p className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm leading-relaxed text-emerald-100">
            Te mandamos el link de acceso a tu email. Tocalo desde el celular o
            la compu donde quieras entrar al panel.
          </p>
        ) : state.devLink ? (
          <div className="mt-6 space-y-3">
            <a
              href={state.devLink}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 py-3.5 text-sm font-bold text-zinc-900 shadow-[0_8px_24px_-8px_rgba(251,191,36,0.6)] transition hover:shadow-[0_12px_32px_-8px_rgba(251,191,36,0.7)]"
            >
              Continuar al panel
              <ArrowRight size={16} />
            </a>
            <p className="text-xs leading-relaxed text-zinc-500">
              Este botón te lleva al panel directo. En producción te llegaría
              el link por email.
            </p>
          </div>
        ) : null}

        <p className="mt-8 text-xs text-zinc-500">
          ¿Necesitás ayuda? Escribinos a{" "}
          <a
            href="mailto:hola@huellitas.app"
            className="text-amber-300 underline underline-offset-2"
          >
            hola@huellitas.app
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-900/30 border-t-zinc-900"
      role="status"
      aria-label="cargando"
    />
  );
}
