import type { Metadata } from "next";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { TerminosVolverButton } from "@/components/legal/TerminosVolverButton";

export const metadata: Metadata = {
  title: "Términos y Condiciones — MascotPoints",
  description:
    "Bases y condiciones del programa de fidelización Huellitas / MascotPoints."
};

const h2Class =
  "mt-10 font-display text-xl font-semibold tracking-tight text-terracotta-300 first:mt-0 sm:text-2xl";

const pClass = "mt-4 text-base leading-relaxed text-bark-100/90";

const ulClass = "mt-4 list-disc space-y-3 pl-6 text-base leading-relaxed text-bark-100/90";

const liClass = "pl-1";

export default function TerminosYCondicionesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-bark-900 via-bark-800 to-bark-900 text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-terracotta-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-bark-600/40 blur-3xl" />
      </div>

      <header className="relative border-b border-white/10 bg-bark-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <TerminosVolverButton />
          <div className="flex items-center gap-2 text-terracotta-400">
            <HuellitaIcon size={20} />
            <span className="font-display text-sm font-bold tracking-tight">
              <span className="text-white">Mascot</span>
              <span className="text-terracotta-400">Points</span>
            </span>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-5 py-10 pb-16 sm:px-8 sm:py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
          Documento legal
        </p>

        <article className="mt-6">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            Términos y Condiciones del Programa de Fidelización &quot;MascotPoints&quot;
          </h1>

          <section className="mt-10">
            <h2 className={h2Class}>1. Generalidades y Aceptación</h2>
            <p className={pClass}>
              El presente reglamento rige el programa de fidelización y acumulación
              de puntos (en adelante, &quot;Huellitas&quot;) aplicable para los clientes
              del comercio. La participación en el programa implica la aceptación
              total de estas bases y condiciones por parte del usuario.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>2. Mecánica de Acumulación y Equivalencias</h2>
            <p className={pClass}>
              El cliente acumulará Huellitas mediante las compras realizadas
              exclusivamente en el local comercial. La relación entre el monto de
              compra y la cantidad de Huellitas otorgadas, así como el valor de
              conversión de cada Huellita, será fijada dinámicamente por la
              administración del comercio y estará siempre expuesta de forma visible
              en el mostrador de caja, cartelería del local o dentro de la
              aplicación móvil. El comercio se reserva el derecho de modificar
              estos valores, mínimos de compra y tasas de conversión en cualquier
              momento, sin previo aviso, para adaptarlos a la situación económica o
              comercial, manteniendo la validez del texto presente.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>3. Identificación del Cliente</h2>
            <p className={pClass}>
              Para la asignación y cómputo de Huellitas, es requisito obligatorio e
              indispensable que el cliente se identifique en la línea de caja
              mediante su método de alta (DNI, Correo Electrónico, Teléfono o
              Escaneo del Código QR de su aplicación) antes de que se emita el
              comprobante de pago. No se realizarán cargas de Huellitas de forma
              retroactiva por compras pasadas donde el cliente no se haya
              identificado.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>4. Registro Único de Mascotas</h2>
            <p className={pClass}>
              Cada cliente podrá registrar a sus mascotas dentro del sistema
              asociando su Nombre, Tipo y Fecha de Nacimiento. Con el fin de
              garantizar la transparencia del programa y evitar fraudes con los
              beneficios de cumpleaños, la fecha de nacimiento cargada quedará
              congelada y no podrá ser modificada por el usuario. En caso de error
              involuntario en la carga, el cliente deberá solicitar la corrección o
              eliminación de forma presencial ante el personal autorizado en el
              local.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>5. Restricciones y Vencimiento Automático</h2>
            <ul className={ulClass}>
              <li className={liClass}>
                Las Huellitas acumuladas son personales, intransferibles y no
                poseen valor monetario comercial directo; bajo ninguna
                circunstancia podrán ser canjeadas por dinero en efectivo, crédito
                de curso legal ni vueltos.
              </li>
              <li className={liClass}>
                <strong className="font-semibold text-white">
                  Vencimiento:
                </strong>{" "}
                Las Huellitas acumuladas tendrán un plazo de caducidad exacto de{" "}
                <strong className="font-semibold text-white">
                  trescientos sesenta y cinco (365) días corridos
                </strong>{" "}
                a partir de la fecha y hora de la compra específica que las
                originó. Cumplido dicho plazo anual, las huellitas correspondientes
                a esa carga expirarán automáticamente del sistema sin derecho a
                reclamo ni reactivación.
              </li>
              <li className={liClass}>
                El programa de Huellitas no es acumulable con otras promociones,
                descuentos vigentes, liquidaciones de stock o convenios especiales
                del local, salvo que el comercio especifique lo contrario de manera
                expresa.
              </li>
            </ul>
          </section>

          <section>
            <h2 className={h2Class}>6. Modificación y Cancelación del Programa</h2>
            <p className={pClass}>
              El comercio se reserva el derecho de auditar las cuentas, cancelar
              la participación de cualquier usuario que haga un uso indebido o
              fraudulento del sistema, y de dar por finalizado o modificar el
              programa &quot;MascotPoints&quot; en cualquier momento, garantizando a los
              usuarios un plazo prudencial para el canje de los puntos acumulados
              hasta la fecha de cierre.
            </p>
          </section>
        </article>

        <footer className="mt-14 border-t border-white/10 pt-8">
          <TerminosVolverButton />
        </footer>
      </main>
    </div>
  );
}
