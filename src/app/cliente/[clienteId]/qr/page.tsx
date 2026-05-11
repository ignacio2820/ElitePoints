import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QRCliente } from "@/components/QRCliente";
import { HuellitaIcon } from "@/components/HuellitaIcon";

export default function QRPage({
  params
}: {
  params: { clienteId: string };
}) {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  const url = `${proto}://${host}/admin/scan/${params.clienteId}`;

  return (
    <main className="paw-bg min-h-screen">
      <header className="border-b border-bark-100 bg-cream-50/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href={`/cliente/${params.clienteId}`} className="inline-flex items-center gap-1.5 text-sm text-bark-500 hover:text-bark-700">
            <ArrowLeft size={14} /> Volver
          </Link>
          <div className="flex items-center gap-2">
            <HuellitaIcon size={22} className="text-bark-400" />
            <span className="font-display text-lg font-semibold text-bark-700">
              Huellitas
            </span>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 py-12">
        <div className="text-center">
          <span className="label-elegant">Identificate en caja</span>
          <h1 className="mt-2 font-display text-4xl font-semibold text-bark-700">
            Mostrá este código al local
          </h1>
          <p className="mt-3 text-[color:var(--muted)]">
            El equipo lo escanea y suma tus huellitas en el momento. Tu información
            queda visible sólo para este Pet Shop.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <QRCliente url={url} size={260} caption="Huellitas · Identidad de cliente" />
        </div>

        <div className="mt-10 rounded-2xl bg-cream-100 p-6 text-center">
          <p className="text-sm text-bark-500">
            ¿Sin app del local? Pueden abrir esta dirección directamente:
          </p>
          <code className="mt-2 inline-block rounded-lg bg-white px-3 py-1.5 text-xs text-bark-700 ring-1 ring-bark-100">
            {url}
          </code>
        </div>
      </section>
    </main>
  );
}
