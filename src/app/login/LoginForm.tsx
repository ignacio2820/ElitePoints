"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Mail,
  PawPrint,
  Sparkles,
  User
} from "lucide-react";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { LoginPasswordDueno } from "@/components/auth/LoginPasswordDueno";
import { PasskeyLoginButton } from "@/components/auth/PasskeyLoginButton";
import { CONTACT_EMAIL, mailtoContact } from "@/lib/contact";
import {
  consultarRolEmail,
  pedirMagicLink,
  registrarseYRecibirMagicLink,
  type RegistrarInput
} from "@/lib/auth/client";

type Modo = "ingresar" | "registrar";
type Especie = RegistrarInput["mascota"]["especie"];

const ESPECIES: { id: Especie; label: string }[] = [
  { id: "perro", label: "Perro" },
  { id: "gato", label: "Gato" },
  { id: "ave", label: "Ave" },
  { id: "reptil", label: "Reptil" },
  { id: "otro", label: "Otro" }
];

export function LoginForm() {
  const sp = useSearchParams();
  /**
   * Política de UX: este formulario SIEMPRE detecta el rol automáticamente.
   * Ignoramos cualquier `?intent=` que venga en la URL (puede haber quedado
   * cacheado de versiones anteriores o de bookmarks). Esto evita el bug
   * "Este email no está autorizado como admin" cuando la URL trae
   * intent=admin pero el usuario en realidad es cliente.
   */
  const redirect = sp.get("redirect") ?? undefined;
  const refCode = sp.get("ref") ?? undefined;
  const localId = sp.get("localId")?.trim() ?? "";

  // Limpiamos los params indeseados (`intent`) sin recargar la página, para
  // que un F5 o "atrás" no vuelvan a inyectar el modo viejo.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("intent")) {
      url.searchParams.delete("intent");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const [modo, setModo] = useState<Modo>("ingresar");

  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [mascotaNombre, setMascotaNombre] = useState("");
  const [mascotaEspecie, setMascotaEspecie] = useState<Especie>("perro");
  const [mascotaFecha, setMascotaFecha] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState<{
    devLink?: string;
    sent: boolean;
    role?: "admin" | "cliente";
    creada?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setExito(null);
    setError(null);
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    reset();
    const res = await pedirMagicLink({
      email: email.trim(),
      intent: "auto",
      redirect
    });
    setEnviando(false);
    if (!res.ok) setError(res.error ?? "Error desconocido");
    else
      setExito({
        devLink: res.devLink,
        sent: !!res.sent,
        role: res.role
      });
  }

  async function onRegistro(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    reset();
    if (!localId) {
      setError(
        "Pedile al local el enlace de registro con su identificador (no podemos asignarte a un comercio por defecto)."
      );
      setEnviando(false);
      return;
    }
    const res = await registrarseYRecibirMagicLink({
      localId,
      email: email.trim(),
      nombre: nombre.trim(),
      mascota: {
        nombre: mascotaNombre.trim(),
        especie: mascotaEspecie,
        fechaNacimiento: mascotaFecha || undefined
      },
      codigoReferido: refCode
    });
    setEnviando(false);
    if (!res.ok) setError(res.error ?? "Error desconocido");
    else
      setExito({
        devLink: res.devLink,
        sent: !!res.sent,
        creada: true,
        role: "cliente"
      });
  }

  return (
    <div className="paw-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-terracotta-400 shadow-soft">
            <HuellitaIcon size={32} className="text-white" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold text-white">
            Huellitas
          </h1>
          <p className="mt-1 text-sm text-bark-100">
            Tu programa de fidelidad para Pet Shops
          </p>
        </div>

        <div className="surface-card overflow-visible rounded-3xl">
          <div className="p-6 sm:p-8">
            {exito ? (
              <ExitoPanel
                email={email}
                datosDev={exito}
                onVolver={() => {
                  reset();
                  setEmail("");
                  setNombre("");
                  setMascotaNombre("");
                  setMascotaFecha("");
                  setModo("ingresar");
                }}
              />
            ) : modo === "ingresar" ? (
              <FormIngresar
                email={email}
                redirect={redirect}
                onEmailChange={setEmail}
                onSubmit={onLogin}
                enviando={enviando}
                error={error}
                onError={setError}
                onIrARegistro={() => {
                  reset();
                  if (!localId) {
                    setError(
                      "Para registrarte necesitás el enlace que te comparte tu Pet Shop (incluye el identificador del local)."
                    );
                    return;
                  }
                  setModo("registrar");
                }}
                registroDisponible={!!localId}
              />
            ) : (
              <FormRegistro
                localId={localId}
                email={email}
                nombre={nombre}
                mascotaNombre={mascotaNombre}
                mascotaEspecie={mascotaEspecie}
                mascotaFecha={mascotaFecha}
                onEmailChange={setEmail}
                onNombreChange={setNombre}
                onMascotaNombreChange={setMascotaNombre}
                onMascotaEspecieChange={setMascotaEspecie}
                onMascotaFechaChange={setMascotaFecha}
                onSubmit={onRegistro}
                enviando={enviando}
                error={error}
                onVolverAIngresar={() => {
                  reset();
                  setModo("ingresar");
                }}
                refCode={refCode}
              />
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-bark-100">
          ¿Problemas para entrar?{" "}
          <a
            href={mailtoContact()}
            className="font-semibold text-white underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>
        </p>

        <div className="surface-card mt-4 rounded-3xl p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-bark-500">
            ¿Sos dueño de un Pet Shop?
          </p>
          <p className="mt-1 text-sm text-bark-600">
            Abrí tu programa de fidelidad propio en 60 segundos.
          </p>
          <a
            href="/onboarding"
            className="btn-primary mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs"
          >
            Registrar mi Pet Shop
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

function FormIngresar({
  email,
  redirect,
  onEmailChange,
  onSubmit,
  enviando,
  error,
  onError,
  onIrARegistro,
  registroDisponible
}: {
  email: string;
  redirect?: string;
  onEmailChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  enviando: boolean;
  error: string | null;
  onError: (msg: string) => void;
  onIrARegistro: () => void;
  registroDisponible: boolean;
}) {
  const [rolEmail, setRolEmail] = useState<"admin" | "cliente" | null>(null);
  const [tienePassword, setTienePassword] = useState(false);

  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setRolEmail(null);
      setTienePassword(false);
      return;
    }
    const t = setTimeout(() => {
      void consultarRolEmail(trimmed).then((res) => {
        if (!res.ok) {
          setRolEmail(null);
          return;
        }
        setRolEmail(res.role ?? null);
        setTienePassword(res.tienePassword === true);
      });
    }, 400);
    return () => clearTimeout(t);
  }, [email]);

  const esDueno = rolEmail === "admin";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-bark-700">
          Ingresá a tu cuenta
        </h2>
        <p className="mt-1 text-sm text-bark-500">
          {esDueno
            ? "Detectamos que sos dueño de un local. Podés usar link mágico o contraseña."
            : "Escribí tu email y te enviamos un link mágico. Detectamos si sos cliente o dueño."}
        </p>
        {esDueno ? (
          <p className="mt-2 inline-block rounded-full bg-terracotta-50 px-2.5 py-0.5 text-xs font-medium text-terracotta-600">
            Cuenta de dueño
          </p>
        ) : null}
      </div>

      <CampoEmail value={email} onChange={onEmailChange} />

      {error && <ErrorBox>{error}</ErrorBox>}

      <button
        type="submit"
        disabled={enviando || !email}
        className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enviando ? (
          <>
            <Spinner /> Enviando...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Enviarme el link mágico
            <ArrowRight size={16} />
          </>
        )}
      </button>

      {esDueno ? (
        <>
          <div className="relative flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-bark-100" />
            <span className="text-xs text-bark-400">o</span>
            <div className="h-px flex-1 bg-bark-100" />
          </div>
          <LoginPasswordDueno
            email={email}
            redirect={redirect}
            tienePassword={tienePassword}
            disabled={enviando}
            onError={onError}
          />
        </>
      ) : null}

      <PasskeyLoginButton
        email={email}
        disabled={enviando}
        onSuccess={() => undefined}
        onError={onError}
      />

      <div className="text-center text-sm text-bark-500">
        ¿No tenés cuenta?{" "}
        <button
          type="button"
          onClick={onIrARegistro}
          className="font-semibold text-bark-700 underline-offset-4 transition hover:underline"
        >
          Registrate acá
        </button>
      </div>

      {!registroDisponible ? (
        <p className="text-center text-xs text-bark-400">
          El alta de clientes requiere el enlace de registro que te comparte tu
          Pet Shop.
        </p>
      ) : null}

      <p className="text-center text-xs text-bark-400">
        {esDueno
          ? "El link mágico expira en 1 hora. La contraseña la configurás en tu panel."
          : "El link expira en 1 hora y solo se usa una vez."}
      </p>
    </form>
  );
}

function FormRegistro({
  localId,
  email,
  nombre,
  mascotaNombre,
  mascotaEspecie,
  mascotaFecha,
  onEmailChange,
  onNombreChange,
  onMascotaNombreChange,
  onMascotaEspecieChange,
  onMascotaFechaChange,
  onSubmit,
  enviando,
  error,
  onVolverAIngresar,
  refCode
}: {
  localId: string;
  email: string;
  nombre: string;
  mascotaNombre: string;
  mascotaEspecie: Especie;
  mascotaFecha: string;
  onEmailChange: (v: string) => void;
  onNombreChange: (v: string) => void;
  onMascotaNombreChange: (v: string) => void;
  onMascotaEspecieChange: (v: Especie) => void;
  onMascotaFechaChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  enviando: boolean;
  error: string | null;
  onVolverAIngresar: () => void;
  refCode?: string;
}) {
  const valido =
    localId.length > 0 &&
    email.trim().length > 3 &&
    nombre.trim().length >= 2 &&
    mascotaNombre.trim().length >= 1;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <button
        type="button"
        onClick={onVolverAIngresar}
        className="-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-bark-500 transition hover:bg-cream-100 hover:text-bark-700"
      >
        <ArrowLeft size={12} /> Volver
      </button>

      <div>
        <h2 className="font-display text-2xl font-semibold text-bark-700">
          Creá tu cuenta de Huellitas
        </h2>
        <p className="mt-1 text-sm text-bark-500">
          Te lleva 30 segundos. Después te llega un link mágico para entrar.
        </p>
        {refCode && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-sage-100 px-3 py-1 text-xs font-medium text-sage-700">
            <Sparkles size={12} />
            Te invitaron con el código <span className="font-mono">{refCode}</span> · sumás Huellitas de bienvenida
          </div>
        )}
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-widest text-bark-500">
          Tu nombre
        </span>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-bark-100 bg-white px-3 py-3 transition focus-within:border-bark-400 focus-within:ring-2 focus-within:ring-bark-300/30">
          <User size={16} className="text-bark-400" />
          <input
            type="text"
            autoComplete="name"
            required
            placeholder="Lucía Romero"
            value={nombre}
            onChange={(e) => onNombreChange(e.target.value)}
            className="w-full bg-transparent text-base text-bark-700 outline-none placeholder:text-bark-300"
          />
        </div>
      </label>

      <CampoEmail value={email} onChange={onEmailChange} />

      <div className="rounded-2xl border border-dashed border-bark-200 bg-cream-50/60 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <PawPrint size={14} className="text-terracotta-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-terracotta-700">
            Tu mascota
          </span>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-bark-500">
            ¿Cómo se llama?
          </span>
          <input
            type="text"
            required
            placeholder="Luna"
            value={mascotaNombre}
            onChange={(e) => onMascotaNombreChange(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-bark-100 bg-white px-3 py-2.5 text-base text-bark-700 outline-none transition placeholder:text-bark-300 focus:border-bark-400 focus:ring-2 focus:ring-bark-300/30"
          />
        </label>

        <div>
          <span className="text-xs font-medium text-bark-500">Especie</span>
          <div className="mt-1.5 grid grid-cols-5 gap-1.5">
            {ESPECIES.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onMascotaEspecieChange(e.id)}
                className={`rounded-xl border-2 px-2 py-2 text-xs font-medium transition ${
                  mascotaEspecie === e.id
                    ? "border-bark-400 bg-white text-bark-700 shadow-sm"
                    : "border-bark-100 bg-white/60 text-bark-500 hover:border-bark-200"
                }`}
                title={e.label}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-bark-500">
            Fecha de nacimiento{" "}
            <span className="text-bark-300">(opcional)</span>
          </span>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-bark-100 bg-white px-3 py-2.5 transition focus-within:border-bark-400 focus-within:ring-2 focus-within:ring-bark-300/30">
            <Calendar size={14} className="text-bark-400" />
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={mascotaFecha}
              onChange={(e) => onMascotaFechaChange(e.target.value)}
              className="w-full bg-transparent text-base text-bark-700 outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-bark-400">
            La podés completar después en tu perfil para recibir el saludo de
            cumpleaños.
          </p>
        </label>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      <button
        type="submit"
        disabled={enviando || !valido}
        className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enviando ? (
          <>
            <Spinner /> Creando tu cuenta...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Crear mi cuenta
            <ArrowRight size={16} />
          </>
        )}
      </button>

      <p className="text-center text-xs text-bark-400">
        Al registrarte aceptás recibir comunicaciones del Pet Shop sobre tu
        programa de fidelidad.
      </p>
    </form>
  );
}

function CampoEmail({
  value,
  onChange
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-bark-500">
        Email
      </span>
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-bark-100 bg-white px-3 py-3 transition focus-within:border-bark-400 focus-within:ring-2 focus-within:ring-bark-300/30">
        <Mail size={16} className="text-bark-400" />
        <input
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-base text-bark-700 outline-none placeholder:text-bark-300"
        />
      </div>
    </label>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
      {children}
    </div>
  );
}

function ExitoPanel({
  email,
  datosDev,
  onVolver
}: {
  email: string;
  datosDev: {
    devLink?: string;
    sent: boolean;
    role?: "admin" | "cliente";
    creada?: boolean;
  };
  onVolver: () => void;
}) {
  const { creada, role } = datosDev;
  const etiqueta =
    role === "admin"
      ? "Detectamos que sos dueño de un local."
      : role === "cliente"
      ? "Detectamos que sos cliente."
      : null;
  return (
    <div className="text-center">
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="font-display text-2xl font-semibold text-bark-700">
            {creada ? "¡Cuenta creada!" : "Revisá tu email"}
          </h2>
          {etiqueta && (
            <p className="inline-block rounded-full bg-cream-100 px-3 py-1 text-xs font-medium text-bark-700">
              {etiqueta}
            </p>
          )}
          <p className="text-sm leading-relaxed text-bark-500">
            {creada
              ? "Tu cuenta está lista. Te enviamos un link mágico a "
              : "Te enviamos un link mágico a "}
            <strong className="text-bark-700">{email}</strong>. Tocalo desde el
            celular o la compu donde quieras ingresar.
          </p>
        </div>

        {datosDev.devLink && (
          <div className="w-full">
            <a href={datosDev.devLink} className="btn-primary w-full text-base">
              Continuar al panel
              <ArrowRight size={18} aria-hidden />
            </a>
          </div>
        )}
      </div>

      <button onClick={onVolver} className="btn-ghost mt-6 inline-flex text-xs">
        Volver al inicio
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cream-50/40 border-t-cream-50" />
  );
}
