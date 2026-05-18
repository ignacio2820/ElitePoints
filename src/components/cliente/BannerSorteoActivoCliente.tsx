import Link from "next/link";
import { Sparkles, Ticket } from "lucide-react";

/**
 * Banner promocional en el inicio del portal del cliente cuando hay sorteos vigentes.
 */
export function BannerSorteoActivoCliente() {
  return (
    <div
      className="mb-6 overflow-hidden rounded-2xl border-2 border-green-600 bg-white shadow-md ring-1 ring-green-100"
      role="region"
      aria-label="Sorteo vigente"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-green-200 bg-green-50 text-green-600"
            aria-hidden
          >
            <Ticket size={24} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-green-700">
              <Sparkles size={14} className="text-green-600" aria-hidden />
              Sorteo activo
            </p>
            <p className="mt-1 font-display text-lg font-bold leading-snug text-[#fb8500]">
              ¡Hay un sorteo vigente para ti! 🐾
            </p>
            <p className="mt-1 text-sm text-bark-600">
              Entrá y multiplicá tus chances con tus Huellitas antes del cierre.
            </p>
          </div>
        </div>
        <Link
          href="/mi-cuenta/sorteos"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
        >
          ¡Quiero Participar!
        </Link>
      </div>
    </div>
  );
}
