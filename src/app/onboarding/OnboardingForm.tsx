"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ImageIcon,
  Mail,
  MapPin,
  PartyPopper,
  Phone,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { Field } from "@/components/ui/Field";
import { comprimirImagenEnCliente } from "@/lib/images/compressImageClient";
import { CONTACT_EMAIL, mailtoContact } from "@/lib/contact";
import { nombreASlug } from "@/lib/huellitas/slug";
import { registrarPetShop, type OnboardingState } from "./actions";

const LOGO_ACCEPT = "image/jpeg,image/png,.jpg,.jpeg,.png";

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
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const slugPreview = useMemo(() => nombreASlug(nombreLocal), [nombreLocal]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="paw-bg flex min-h-screen flex-col lg:flex-row">
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-bark-100 bg-cream-50/80 p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-terracotta-200/20 blur-3xl"
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-bark-600">
            <Sparkles size={12} className="text-bark-500" /> Onboarding · Dueños
          </div>
          <h1 className="mt-6 max-w-md font-display text-4xl font-semibold leading-tight text-bark-700 xl:text-5xl">
            Tu Pet Shop con un programa de fidelidad de verdad.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[color:var(--muted)]">
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

        <p className="relative mt-10 text-xs text-bark-400">
          ¿Ya sos dueño de un Pet Shop con cuenta? Volvé a la{" "}
          <a href="/login" className="font-semibold text-bark-700 underline underline-offset-2">
            pantalla de ingreso
          </a>
          .
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="surface-card overflow-visible rounded-2xl">
            <div className="p-6 sm:p-8">
              <div className="lg:hidden">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-cream-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-bark-600">
                  <Sparkles size={12} className="text-bark-500" /> Onboarding · Dueños
                </div>
                <h1 className="mt-4 font-display text-3xl font-semibold text-bark-700">
                  Crear tu Pet Shop
                </h1>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Un programa de fidelidad listo en 60 segundos.
                </p>
              </div>

              <form
                action={formAction}
                encType="multipart/form-data"
                className="mt-8 space-y-5 lg:mt-0"
              >
                <CampoConIcono
                  label="Nombre del local"
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
                    placeholder="Mi Pet Shop o Veterinaria"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="organization"
                    className="w-full bg-transparent text-base text-bark-700 outline-none placeholder:text-bark-300"
                  />
                </CampoConIcono>

                <CampoConIcono
                  label="Teléfono de WhatsApp"
                  hint="Lo usan tus clientes para consultarte desde Mi Cuenta."
                  icon={<Phone size={16} />}
                >
                  <input
                    type="tel"
                    name="telefonoWhatsapp"
                    placeholder="+54 9 11 0000-0000"
                    required
                    maxLength={30}
                    autoComplete="tel"
                    className="w-full bg-transparent text-base text-bark-700 outline-none placeholder:text-bark-300"
                  />
                </CampoConIcono>

                <CampoConIcono
                  label="Dirección"
                  hint="Calle, número y ciudad. Tus clientes la ven en su portal."
                  icon={<MapPin size={16} />}
                >
                  <input
                    type="text"
                    name="direccion"
                    placeholder="Av. Corrientes 1234, CABA"
                    required
                    minLength={3}
                    maxLength={300}
                    autoComplete="street-address"
                    className="w-full bg-transparent text-base text-bark-700 outline-none placeholder:text-bark-300"
                  />
                </CampoConIcono>

                <Field
                  label="Logo del local"
                  hint="JPG, JPEG o PNG. Se comprime automáticamente para cargar más rápido."
                >
                  <div className="flex flex-wrap items-start gap-4">
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoPreview}
                        alt="Vista previa del logo"
                        className="h-14 w-14 shrink-0 rounded-xl border border-amber-200/70 bg-white object-cover shadow-soft"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-bark-200 bg-cream-50 text-bark-300">
                        <ImageIcon size={22} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <input
                        type="file"
                        name="logo"
                        accept={LOGO_ACCEPT}
                        required
                        className="block w-full cursor-pointer text-sm text-bark-600 file:mr-3 file:rounded-xl file:border file:border-amber-200/80 file:bg-cream-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-bark-700"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          setLogoError(null);
                          if (!file) {
                            setLogoPreview(null);
                            return;
                          }
                          const tipo = file.type.toLowerCase();
                          const nombre = file.name.toLowerCase();
                          const ok =
                            tipo === "image/jpeg" ||
                            tipo === "image/png" ||
                            nombre.endsWith(".jpg") ||
                            nombre.endsWith(".jpeg") ||
                            nombre.endsWith(".png");
                          if (!ok) {
                            setLogoError("Solo JPG, JPEG o PNG.");
                            e.target.value = "";
                            return;
                          }
                          try {
                            const comprimida = await comprimirImagenEnCliente(file);
                            setLogoPreview(URL.createObjectURL(comprimida));
                            const dt = new DataTransfer();
                            dt.items.add(comprimida);
                            e.target.files = dt.files;
                          } catch (err) {
                            setLogoError(
                              err instanceof Error
                                ? err.message
                                : "No pudimos procesar la imagen."
                            );
                            e.target.value = "";
                          }
                        }}
                      />
                      {logoError ? (
                        <p className="text-xs text-rose-600">{logoError}</p>
                      ) : null}
                    </div>
                  </div>
                </Field>

                <CampoConIcono
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
                    className="w-full bg-transparent text-base text-bark-700 outline-none placeholder:text-bark-300"
                  />
                </CampoConIcono>

                {errorMsg && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    {errorMsg}
                  </div>
                )}

                <BotonEnviar />

                <p className="text-center text-xs leading-relaxed text-bark-400">
                  Al continuar aceptás recibir el email con el link de acceso al
                  panel. Sin contraseñas. El link expira en 1 hora.
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CampoConIcono({
  label,
  hint,
  icon,
  children
}: {
  label: string;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2 rounded-xl border border-bark-100 bg-white px-3 py-3 transition focus-within:border-bark-400 focus-within:ring-2 focus-within:ring-bark-300/30">
        <span className="text-bark-400">{icon}</span>
        {children}
      </div>
    </Field>
  );
}

function BotonEnviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
    >
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
    </button>
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
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200/80 bg-white text-bark-600 shadow-soft">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-bark-700">{titulo}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--muted)]">{sub}</p>
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
    <div className="paw-bg flex min-h-screen items-center justify-center px-6 py-12">
      <div className="surface-card w-full max-w-md p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 size={32} />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold text-bark-700">
          ¡Tu Pet Shop está listo!
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
          Creamos tu local con el identificador{" "}
          <code className="rounded-lg bg-cream-100 px-2 py-0.5 font-mono text-sm text-bark-700 ring-1 ring-bark-100">
            {state.localId}
          </code>{" "}
          y configuramos tu programa de fidelidad con valores saludables (1%
          de costo).
        </p>

        {state.sent ? (
          <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800">
            Te mandamos el link de acceso a tu email. Tocalo desde el celular o
            la compu donde quieras entrar al panel.
          </p>
        ) : state.devLink ? (
          <div className="mt-6 space-y-3">
            <a href={state.devLink} className="btn-primary w-full justify-center">
              Continuar al panel
              <ArrowRight size={16} />
            </a>
            <p className="text-xs leading-relaxed text-bark-400">
              Este botón te lleva al panel directo. En producción te llegaría
              el link por email.
            </p>
          </div>
        ) : null}

        <p className="mt-8 text-xs text-bark-400">
          ¿Necesitás ayuda? Escribinos a{" "}
          <a
            href={mailtoContact()}
            className="font-semibold text-bark-700 underline underline-offset-2"
          >
            {CONTACT_EMAIL}
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
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cream-50/40 border-t-cream-50"
      role="status"
      aria-label="cargando"
    />
  );
}
