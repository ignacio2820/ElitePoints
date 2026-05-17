import Link from "next/link";
import { Cake, Gift, MessageCircle } from "lucide-react";
import {
  listarCumpleanosMesActual,
  type CumpleanoProximo
} from "@/lib/huellitas/cumpleanosDashboardService";
import { HUELLITAS_REGALO_CUMPLEANOS } from "@/lib/huellitas/cumpleanosConstants";
import { urlWhatsAppFelicitacionCumple } from "@/lib/huellitas/cumpleanosProximos";
import { nombreMesActual } from "@/lib/huellitas/cumpleanosCarteleraUtils";
import { getInfoLocal } from "@/lib/huellitas/localService";

export async function DashboardCumpleanos({ localId }: { localId: string }) {
  let errorMsg: string | null = null;

  try {
    const hoy = new Date();
    const [cartelera, info] = await Promise.all([
      listarCumpleanosMesActual(localId, { hoy }),
      getInfoLocal(localId)
    ]);
    const nombreLocal = info.nombre?.trim() || "tu Pet Shop";
    const mesLabel = nombreMesActual(hoy);

    const hoyLista = cartelera.filter((c) => c.estadoMes === "hoy");
    const proximos = cartelera.filter((c) => c.estadoMes === "proximo");
    const pasados = cartelera.filter((c) => c.estadoMes === "pasado");

    return (
      <section id="cumpleanos" className="mb-10 scroll-mt-24">
        <Cabecera mesLabel={mesLabel} />

        <article className="overflow-hidden rounded-3xl bg-gradient-to-br from-bark-800 via-bark-800 to-bark-900 p-6 shadow-soft ring-1 ring-white/10 sm:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/90">
                Cartelera del mes
              </p>
              <h3 className="mt-1 font-display text-xl font-semibold capitalize text-cream-50 sm:text-2xl">
                {mesLabel}
              </h3>
              <p className="mt-2 max-w-xl text-sm text-cream-100/70">
                Ordenado por día del mes (sin año). El cron diario regala{" "}
                <strong className="text-amber-200">{HUELLITAS_REGALO_CUMPLEANOS} huellitas</strong>{" "}
                el día exacto del cumple.
              </p>
            </div>
            <div className="flex gap-3 text-center">
              <StatChip label="Hoy" value={hoyLista.length} destacado />
              <StatChip label="Próximos" value={proximos.length} />
              <StatChip label="Ya cumplieron" value={pasados.length} />
            </div>
          </div>

          {cartelera.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-10 text-center text-sm text-cream-100/70">
              Ninguna mascota cumple años en {mesLabel}. Revisá que tengan fecha de
              nacimiento cargada.
            </p>
          ) : (
            <div className="space-y-8">
              {hoyLista.length > 0 ? (
                <BloqueCartelera
                  titulo="Cumplen hoy"
                  descripcion="¡Festejo en el local! El regalo automático se acredita con el cron."
                  items={hoyLista}
                  nombreLocal={nombreLocal}
                  urgente
                />
              ) : null}
              {proximos.length > 0 ? (
                <BloqueCartelera
                  titulo="Próximos en el mes"
                  descripcion="Planificá el saludo antes de su día."
                  items={proximos}
                  nombreLocal={nombreLocal}
                />
              ) : null}
              {pasados.length > 0 ? (
                <BloqueCartelera
                  titulo="Ya cumplieron este mes"
                  descripcion="Referencia para no olvidar el saludo retroactivo."
                  items={pasados}
                  nombreLocal={nombreLocal}
                  atenuado
                />
              ) : null}
            </div>
          )}
        </article>
      </section>
    );
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Error desconocido";
  }

  return (
    <section className="mb-10">
      <Cabecera mesLabel={nombreMesActual()} />
      <div className="rounded-3xl border border-amber-500/30 bg-bark-900/80 p-5 text-sm text-amber-100 ring-1 ring-amber-500/20">
        No pudimos cargar la cartelera de cumpleaños.
        {errorMsg ? (
          <span className="mt-1 block text-xs text-amber-200/70">{errorMsg}</span>
        ) : null}
      </div>
    </section>
  );
}

function Cabecera({ mesLabel }: { mesLabel: string }) {
  return (
    <div className="mb-5">
      <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/20 to-terracotta-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200 ring-1 ring-amber-400/30">
        <Cake size={12} />
        Fidelización · Cumpleaños
      </span>
      <h2 className="mt-3 font-display text-2xl font-bold text-bark-700 sm:text-3xl">
        Cartelera de cumpleaños
      </h2>
      <p className="mt-1 text-sm text-bark-600">
        Mascotas que festejan en <span className="font-semibold capitalize">{mesLabel}</span>,
        ordenadas por día. Ignoramos el año de nacimiento.
      </p>
    </div>
  );
}

function StatChip({
  label,
  value,
  destacado = false
}: {
  label: string;
  value: number;
  destacado?: boolean;
}) {
  return (
    <div
      className={
        destacado
          ? "min-w-[4.5rem] rounded-2xl bg-gradient-to-br from-amber-400/25 to-terracotta-500/20 px-3 py-2 ring-1 ring-amber-300/40"
          : "min-w-[4.5rem] rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10"
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-cream-100/60">
        {label}
      </p>
      <p className="font-display text-2xl font-bold text-cream-50">{value}</p>
    </div>
  );
}

function BloqueCartelera({
  titulo,
  descripcion,
  items,
  nombreLocal,
  urgente = false,
  atenuado = false
}: {
  titulo: string;
  descripcion: string;
  items: CumpleanoProximo[];
  nombreLocal: string;
  urgente?: boolean;
  atenuado?: boolean;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3
          className={`font-display text-lg font-bold ${
            urgente ? "text-amber-200" : atenuado ? "text-cream-100/50" : "text-cream-50"
          }`}
        >
          {titulo}
        </h3>
        <p className="text-xs text-cream-100/55">{descripcion}</p>
      </div>
      <ul className="space-y-2">
        {items.map((c) => (
          <FilaCumpleano
            key={`${c.clienteId}-${c.mascotaId}`}
            item={c}
            nombreLocal={nombreLocal}
            urgente={urgente}
            atenuado={atenuado}
          />
        ))}
      </ul>
    </div>
  );
}

function FilaCumpleano({
  item,
  nombreLocal,
  urgente = false,
  atenuado = false
}: {
  item: CumpleanoProximo;
  nombreLocal: string;
  urgente?: boolean;
  atenuado?: boolean;
}) {
  const wa = item.telefono
    ? urlWhatsAppFelicitacionCumple({
        telefono: item.telefono,
        nombreMascota: item.nombreMascota,
        nombreDueno: item.nombreDueno.split(" ")[0] || item.nombreDueno,
        nombreLocal,
        diaCumple: item.diaCumpleEtiqueta
      })
    : null;

  const etiquetaDia =
    item.estadoMes === "hoy"
      ? "Hoy"
      : item.estadoMes === "pasado"
        ? `Día ${item.diaMes} · ya pasó`
        : `Día ${item.diaMes} · en ${item.diasRestantes} d`;

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
        urgente
          ? "border-amber-400/40 bg-gradient-to-r from-amber-500/15 to-terracotta-500/10 ring-1 ring-amber-300/30"
          : atenuado
            ? "border-white/5 bg-white/[0.03] opacity-80"
            : "border-white/10 bg-white/5"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-display text-base font-bold text-cream-50">
          {urgente ? (
            <Gift size={16} className="shrink-0 text-amber-300" aria-hidden />
          ) : null}
          {item.nombreMascota}
          <span className="font-sans text-sm font-medium text-cream-100/55">
            · {item.nombreDueno}
          </span>
        </p>
        <p className="mt-0.5 text-sm text-cream-100/65">
          <span className={urgente ? "font-semibold text-amber-200" : ""}>
            {item.diaCumpleEtiqueta}
          </span>
          <span className="text-cream-100/40"> · </span>
          {etiquetaDia}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link
          href={`/admin/scan/${encodeURIComponent(item.clienteId)}`}
          className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-cream-50 transition hover:bg-white/15"
        >
          Ver ficha
        </Link>
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/25"
          >
            <MessageCircle size={14} />
            Felicitar
          </a>
        ) : item.email ? (
          <a
            href={`mailto:${item.email}?subject=${encodeURIComponent(`¡Feliz cumple, ${item.nombreMascota}!`)}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-cream-50 transition hover:bg-white/15"
          >
            <MessageCircle size={14} />
            Email
          </a>
        ) : null}
      </div>
    </li>
  );
}
