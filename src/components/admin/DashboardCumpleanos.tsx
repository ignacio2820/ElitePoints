import Link from "next/link";
import { Cake, MessageCircle } from "lucide-react";
import {
  listarCumpleanosDashboardAgrupados,
  type CumpleanoProximo
} from "@/lib/huellitas/cumpleanosDashboardService";
import { urlWhatsAppFelicitacionCumple } from "@/lib/huellitas/cumpleanosProximos";
import { getInfoLocal } from "@/lib/huellitas/localService";

export async function DashboardCumpleanos({ localId }: { localId: string }) {
  let errorMsg: string | null = null;

  try {
    const [{ estaSemana, proximasSemanas }, info] = await Promise.all([
      listarCumpleanosDashboardAgrupados(localId),
      getInfoLocal(localId)
    ]);
    const nombreLocal = info.nombre?.trim() || "tu Pet Shop";
    const vacio = estaSemana.length === 0 && proximasSemanas.length === 0;

    return (
      <section id="cumpleanos" className="mb-10 scroll-mt-24">
        <Cabecera />
        <article className="card space-y-6 rounded-3xl p-6">
          {vacio ? (
            <p className="rounded-2xl border border-dashed border-bark-200 bg-cream-50/80 px-4 py-8 text-center text-sm text-bark-600">
              No hay cumpleaños de mascotas programados para las próximas
              semanas.
            </p>
          ) : (
            <>
              <BloqueCumpleanos
                titulo="Esta semana"
                descripcion="Hoy, mañana y los cumpleaños de los próximos días."
                items={estaSemana}
                nombreLocal={nombreLocal}
                destacado
                vacio="Nadie cumple esta semana."
              />
              <BloqueCumpleanos
                titulo="Próximas semanas"
                descripcion="Entre 7 y 30 días — planificá el saludo con tiempo."
                items={proximasSemanas}
                nombreLocal={nombreLocal}
                vacio="Nada entre 7 y 30 días."
              />
            </>
          )}
        </article>
      </section>
    );
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Error desconocido";
  }

  return (
    <section className="mb-10">
      <Cabecera />
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        No pudimos cargar los cumpleaños próximos.
        {errorMsg ? (
          <span className="mt-1 block text-xs text-amber-800/80">{errorMsg}</span>
        ) : null}
      </div>
    </section>
  );
}

function Cabecera() {
  return (
    <div className="mb-5">
      <span className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-pink-700">
        <Cake size={12} />
        Cumpleaños
      </span>
      <h2 className="mt-2 font-display text-2xl font-bold text-bark-700 sm:text-3xl">
        Próximos cumpleaños de mascotas
      </h2>
      <p className="mt-1 text-sm text-bark-600">
        Esta semana y el calendario de las próximas semanas. Saludá al dueño por
        WhatsApp con un toque.
      </p>
    </div>
  );
}

function BloqueCumpleanos({
  titulo,
  descripcion,
  items,
  nombreLocal,
  destacado = false,
  vacio
}: {
  titulo: string;
  descripcion: string;
  items: CumpleanoProximo[];
  nombreLocal: string;
  destacado?: boolean;
  vacio: string;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3
          className={`font-display text-lg font-bold ${
            destacado ? "text-pink-800" : "text-bark-700"
          }`}
        >
          {titulo}
        </h3>
        <p className="text-xs text-bark-500">{descripcion}</p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl bg-cream-50/80 px-3 py-2 text-center text-xs text-bark-500">
          {vacio}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <FilaCumpleano
              key={`${c.clienteId}-${c.mascotaId}`}
              item={c}
              nombreLocal={nombreLocal}
              urgente={destacado && c.diasRestantes <= 1}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilaCumpleano({
  item,
  nombreLocal,
  urgente = false
}: {
  item: CumpleanoProximo;
  nombreLocal: string;
  urgente?: boolean;
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

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
        urgente
          ? "border-pink-200 bg-pink-50/90 ring-1 ring-pink-100"
          : "border-bark-100 bg-cream-50/80"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold text-bark-800">
          {item.nombreMascota}
          <span className="font-sans text-sm font-medium text-bark-500">
            {" "}
            · dueño/a {item.nombreDueno}
          </span>
        </p>
        <p className="mt-0.5 text-sm text-bark-600">
          <span
            className={`font-semibold ${urgente ? "text-pink-700" : "text-pink-600"}`}
          >
            {item.diaCumpleEtiqueta}
          </span>
          <span className="text-bark-400"> · </span>
          <span
            className={
              urgente ? "font-semibold text-pink-800" : "text-bark-500"
            }
          >
            {item.diasRestantes === 0
              ? "Cumple hoy"
              : item.diasRestantes === 1
                ? "Mañana"
                : `En ${item.diasRestantes} días`}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link
          href={`/admin/scan/${encodeURIComponent(item.clienteId)}`}
          className="rounded-xl border border-bark-200 bg-white px-3 py-2 text-xs font-semibold text-bark-700 transition hover:bg-cream-100"
        >
          Ver ficha
        </Link>
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100"
          >
            <MessageCircle size={14} />
            Felicitar
          </a>
        ) : item.email ? (
          <a
            href={`mailto:${item.email}?subject=${encodeURIComponent(`¡Feliz cumple, ${item.nombreMascota}!`)}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-bark-200 bg-white px-3 py-2 text-xs font-semibold text-bark-700 transition hover:bg-cream-100"
          >
            <MessageCircle size={14} />
            Email
          </a>
        ) : null}
      </div>
    </li>
  );
}
