import {
  BarChart3,
  Headphones,
  MessageCircle,
  Smartphone,
  Store,
  Sparkles
} from "lucide-react";

const WHATSAPP_NUMERO = "543446536509";

const BENEFICIOS_PLAN = [
  {
    icon: Store,
    text: "Acceso total al panel de caja y administración"
  },
  {
    icon: Smartphone,
    text: "App móvil para tus clientes (Mi Cuenta)"
  },
  {
    icon: Sparkles,
    text: "Fidelización por Puntos sin límite de clientes"
  },
  {
    icon: BarChart3,
    text: "Reportes, sorteos y encuestas de satisfacción"
  },
  {
    icon: Headphones,
    text: "Soporte técnico 24/7 de la agencia"
  }
] as const;

const PLANES = [
  {
    id: "mensual",
    titulo: "Plan Mensual",
    etiquetaValor: "Suscripción Premium",
    subtitulo:
      "Empezá digital sin atarte a largo plazo. Ideal para probar ElitePoints en tu mostrador.",
    destacado: false,
    badge: null as string | null,
    cta: "Solicitar Asesoramiento Personalizado",
    mensajeWhatsApp:
      "Hola Ignacio! Me interesa la plataforma ElitePoints. Quisiera recibir asesoramiento sobre el Plan Mensual para mi comercio."
  },
  {
    id: "semestral",
    titulo: "Plan Semestral",
    etiquetaValor: "Bonificación por Lanzamiento",
    subtitulo:
      "Compromiso medio plazo con condiciones preferenciales para comercios que ya decidieron crecer.",
    destacado: true,
    badge: "10% OFF",
    cta: "Activar Plan en mi comercio",
    mensajeWhatsApp:
      "Hola Ignacio! Vi la plataforma ElitePoints y quiero consultar las condiciones del Plan Semestral con el 10% de descuento."
  },
  {
    id: "anual",
    titulo: "Plan Anual",
    etiquetaValor: "Pago Flexible con Descuento",
    subtitulo:
      "Máximo ahorro y prioridad en onboarding. Pensado para comercios que quieren escalar su comunidad.",
    destacado: false,
    badge: "30% OFF",
    cta: "Solicitar Asesoramiento Personalizado",
    mensajeWhatsApp:
      "Hola Ignacio! Quiero digitalizar mi comercio con el Plan Anual de ElitePoints. ¿Me brindarías asesoramiento sobre las formas de pago con el 30% OFF?"
  }
] as const;

function urlWhatsAppPlan(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

export function LandingPlanesSection() {
  return (
    <section
      id="planes"
      className="border-t border-bark-100 bg-gradient-to-b from-cream-50 to-white py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">
            Membresías
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold text-bark-700 sm:text-4xl">
            Elegí el plan para tu Pet Shop o Veterinaria
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-bark-600">
            Sin precios publicados en la web: cada local es distinto. Charlamos por
            WhatsApp y armamos la propuesta que mejor calce con tu operación.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {PLANES.map((plan) => (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border bg-white p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-lg ${
                plan.destacado
                  ? "border-emerald-300 ring-2 ring-emerald-500/25 lg:scale-[1.02]"
                  : "border-bark-100"
              }`}
            >
              {plan.badge ? (
                <span
                  className={`absolute -top-3 right-6 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                    plan.destacado
                      ? "bg-[#fb8500] text-white shadow-md"
                      : "bg-emerald-800 text-white"
                  }`}
                >
                  {plan.badge}
                </span>
              ) : null}

              {plan.destacado ? (
                <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800 ring-1 ring-emerald-200">
                  Más elegido
                </span>
              ) : (
                <span className="mb-3 block h-6" aria-hidden />
              )}

              <h3 className="font-display text-xl font-bold text-bark-800">
                {plan.titulo}
              </h3>

              <p className="mt-3 font-display text-2xl font-semibold leading-tight text-emerald-800">
                {plan.etiquetaValor}
              </p>

              <p className="mt-3 flex-1 text-sm leading-relaxed text-bark-600">
                {plan.subtitulo}
              </p>

              <ul className="mt-6 space-y-3 border-t border-bark-100 pt-6">
                {BENEFICIOS_PLAN.map((b) => (
                  <li key={b.text} className="flex items-start gap-3 text-sm text-bark-700">
                    <b.icon
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-600"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span>{b.text}</span>
                  </li>
                ))}
              </ul>

              <a
                href={urlWhatsAppPlan(plan.mensajeWhatsApp)}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold transition ${
                  plan.destacado
                    ? "bg-[#fb8500] text-white shadow-md hover:bg-orange-600"
                    : "border border-emerald-800 bg-emerald-800 text-white hover:bg-emerald-900"
                }`}
              >
                <MessageCircle size={18} aria-hidden />
                {plan.cta}
              </a>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-bark-500">
          Los porcentajes de descuento aplican según condiciones comerciales acordadas
          por WhatsApp. No incluyen impuestos ni integraciones de terceros no
          mencionadas en la propuesta.
        </p>
      </div>
    </section>
  );
}
