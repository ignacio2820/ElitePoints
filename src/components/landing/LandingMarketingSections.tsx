import {
  Award,
  BarChart3,
  CheckCircle2,
  LineChart,
  MessageSquareWarning,
  Ticket
} from "lucide-react";
import { LandingContactForm } from "@/components/landing/LandingContactForm";
import { LandingPlanesSection } from "@/components/landing/LandingPlanesSection";
import { ElitePointsFooter } from "@/components/ElitePointsFooter";

const FEATURES = [
  {
    icon: Ticket,
    emoji: "🎟️",
    title: "Sorteos automatizados",
    description:
      "Creá sorteos con bases de puntos y selección de ganadores transparente para mantener a tu comunidad activa."
  },
  {
    icon: Award,
    emoji: "🏅",
    title: "Niveles de fidelización premium",
    description:
      "Bronce, Plata, Oro y Elite con multiplicadores configurables para premiar a tus mejores clientes y hacer crecer el ticket promedio."
  },
  {
    icon: LineChart,
    emoji: "📊",
    title: "Estadísticas de canjes en tiempo real",
    description:
      "Dashboard con métricas de canjes, premios más redimidos y evolución del programa para decidir con datos, no con intuición."
  },
  {
    icon: MessageSquareWarning,
    emoji: "📈",
    title: "Gestión de quejas y recuperación (NPS)",
    description:
      "Monitoreo de encuestas de satisfacción automatizadas post-compra con alertas críticas y «Botón de Disculpa» para retener clientes en riesgo."
  }
] as const;

const BENEFITS = [
  {
    title: "Aumento del ticket promedio",
    text: "Los clientes compran más para acumular puntos y alcanzar el próximo nivel de lealtad."
  },
  {
    title: "Automatización total",
    text: "El sistema trabaja por vos con encuestas post-compra y alertas automáticas en piloto, sin depender de planillas."
  },
  {
    title: "Reputación blindada",
    text: "Resolvé las quejas de forma privada en tu panel antes de que se conviertan en una mala reseña en Google Maps."
  },
  {
    title: "Decisiones basadas en datos",
    text: "Conocé tu tasa de canje real y cuáles son los premios más deseados por tus clientes."
  }
] as const;

export function LandingMarketingSections() {
  return (
    <>
      <section className="border-t border-white/10 bg-cream-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center animate-fade-in-up">
            <span className="inline-block rounded-full bg-green-100 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-green-800">
              Plataforma todo-en-uno
            </span>
            <h2 className="mt-4 font-display text-3xl font-extrabold text-bark-700 sm:text-4xl">
              ¿Qué es ElitePoints y qué podés hacer?
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-bark-600">
              El motor de fidelización diseñado para comercios que quieren crecer
              con datos, no con suposiciones.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className={`group rounded-3xl border border-bark-100 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lg ${
                  i === 0
                    ? "animate-fade-in-up"
                    : i === 1
                      ? "animate-fade-in-up-delay-1"
                      : i === 2
                        ? "animate-fade-in-up-delay-2"
                        : "animate-fade-in-up-delay-3"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-2xl ring-1 ring-green-100">
                  <span aria-hidden>{f.emoji}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <f.icon
                    size={18}
                    className="text-green-600"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <h3 className="font-display text-lg font-bold text-bark-700">
                    {f.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-bark-600">
                  {f.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-bark-100 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6 lg:grid lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-5 animate-fade-in-up">
            <span className="inline-block rounded-full bg-terracotta-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-terracotta-500">
              Para dueños de comercios
            </span>
            <h2 className="mt-4 font-display text-3xl font-extrabold text-bark-700 sm:text-4xl">
              Cómo se beneficia tu comercio
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-bark-600">
              ElitePoints no es solo un programa de puntos: es tu equipo de
              retención, marketing y reputación trabajando en segundo plano.
            </p>
          </div>

          <ul className="mt-10 space-y-5 lg:col-span-7 lg:mt-0">
            {BENEFITS.map((b, i) => (
              <li
                key={b.title}
                className={`flex gap-4 rounded-2xl border border-bark-100 bg-cream-50/80 p-5 transition hover:border-green-200 hover:bg-green-50/40 ${
                  i % 2 === 0 ? "animate-fade-in-up" : "animate-fade-in-up-delay-2"
                }`}
              >
                <CheckCircle2
                  size={24}
                  className="mt-0.5 shrink-0 text-green-600"
                  strokeWidth={2}
                  aria-hidden
                />
                <div>
                  <h3 className="font-display text-lg font-bold text-bark-700">
                    {b.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-bark-600">
                    {b.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <LandingPlanesSection />

      <LandingContactForm />

      <ElitePointsFooter
        variant="onDark"
        className="border-white/10 bg-bark-900 text-left sm:text-center"
      />
    </>
  );
}
