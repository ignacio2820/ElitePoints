"use client";

import { useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/contact";

const WHATSAPP_NUMERO = "3446536509";
const WHATSAPP_MENSAJE =
  "Hola WebElite, quiero recibir información sobre ElitePoints para mi comercio.";

const inputClass =
  "mt-2 w-full rounded-2xl border border-bark-200/80 bg-white px-4 py-3 text-sm text-bark-800 shadow-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-500/25";

const labelClass =
  "text-xs font-bold uppercase tracking-[0.14em] text-bark-600";

export function LandingContactForm() {
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [nombreComercio, setNombreComercio] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [consulta, setConsulta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const waUrl = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(WHATSAPP_MENSAJE)}`;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(false);
    setEnviando(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreCompleto,
          nombreComercio,
          email,
          telefono,
          consulta
        })
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudo enviar. Intentá de nuevo.");
        return;
      }
      setExito(true);
      setNombreCompleto("");
      setNombreComercio("");
      setEmail("");
      setTelefono("");
      setConsulta("");
    } catch {
      setError("Error de conexión. Verificá tu red e intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section
      id="contacto"
      className="scroll-mt-8 border-t border-white/10 bg-gradient-to-b from-bark-800/40 to-bark-900/80 py-20"
    >
      <div className="mx-auto max-w-3xl px-6 text-center animate-fade-in-up">
        <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
          Contacto comercial
        </span>
        <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
          Lleva tu negocio al estándar Élite.
        </h2>
        <p className="mt-3 text-lg text-bark-100">
          Solicitá una demostración o asesoría personalizada. Te respondemos a{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-terracotta-300 underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="mx-auto mt-10 max-w-xl animate-fade-in-up-delay-1 rounded-3xl border border-white/10 bg-white p-6 shadow-soft sm:p-8"
      >
        <div className="space-y-5 text-left">
          <label className="block">
            <span className={labelClass}>Nombre completo</span>
            <input
              type="text"
              required
              maxLength={120}
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              className={inputClass}
              placeholder="Ej: María González"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Nombre del comercio</span>
            <input
              type="text"
              required
              maxLength={120}
              value={nombreComercio}
              onChange={(e) => setNombreComercio(e.target.value)}
              className={inputClass}
              placeholder="Ej: Boutique Nova, Bar Central…"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Correo electrónico</span>
            <input
              type="email"
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="tu@email.com"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Teléfono / WhatsApp</span>
            <input
              type="tel"
              required
              maxLength={40}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={inputClass}
              placeholder="+54 9 11 1234-5678"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Escribe tu consulta</span>
            <textarea
              required
              rows={4}
              maxLength={4000}
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              className={`${inputClass} min-h-[120px] resize-y`}
              placeholder="Contanos sobre tu comercio, cantidad de clientes y qué te gustaría lograr con ElitePoints."
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {exito ? (
          <p
            className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
            role="status"
          >
            ¡Mensaje enviado! Nos pondremos en contacto pronto.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={enviando}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? <Loader2 size={20} className="animate-spin" /> : null}
          Enviar solicitud
        </button>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#25D366] bg-[#25D366]/10 px-6 py-3.5 text-sm font-bold text-bark-700 transition hover:bg-[#25D366]/20"
        >
          <MessageCircle size={20} className="text-[#25D366]" aria-hidden />
          Escribinos por WhatsApp
        </a>
      </form>
    </section>
  );
}
