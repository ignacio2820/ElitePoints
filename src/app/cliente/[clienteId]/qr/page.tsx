import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { MascotPointsFooter } from "@/components/MascotPointsFooter";
import type { Cliente } from "@/lib/huellitas/types";
import { rutaConLocalId } from "@/lib/huellitas/tenant";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tu tarjeta de fidelidad — Huellitas"
};

export default async function ClienteQrPage({
  params,
  searchParams
}: {
  params: { clienteId: string };
  searchParams?: { localId?: string };
}) {
  const localId = searchParams?.localId?.trim();
  if (!localId) notFound();

  const db = adminDb();
  const [clienteSnap, localSnap] = await Promise.all([
    cols.cliente(db, localId, params.clienteId).get(),
    cols.local(db, localId).get()
  ]);

  if (!clienteSnap.exists) notFound();

  const cliente = clienteSnap.data() as Cliente;
  const nombreLocal =
    (localSnap.data() as { nombre?: string } | undefined)?.nombre ?? localId;

  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const scanUrl = `${proto}://${host}/admin/scan/${params.clienteId}`;

  const qrSvg = await QRCode.toString(scanUrl, {
    type: "svg",
    margin: 1,
    color: { dark: "#221308", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
    width: 300
  });

  const volverHref = rutaConLocalId(`/cliente/${params.clienteId}`, localId);

  return (
    <div className="flex min-h-screen flex-col bg-cream-50">
      <header className="border-b border-bark-100 bg-cream-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link
            href={volverHref}
            className="inline-flex items-center gap-1.5 text-sm text-bark-500 transition hover:text-bark-700"
          >
            <ArrowLeft size={14} />
            Volver
          </Link>
          <div className="flex items-center gap-2">
            <HuellitaIcon size={22} className="text-amber-600" />
            <span className="font-display text-lg font-semibold text-bark-700">
              Huellitas
            </span>
          </div>
          <div className="w-14" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        <div className="text-center">
          <span className="label-elegant">Tarjeta digital</span>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-bark-700">
            Tu tarjeta de fidelidad en{" "}
            <span className="text-amber-700">{nombreLocal}</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
            Mostrá este código en caja para sumar Huellitas en cada visita.
          </p>
        </div>

        <div className="mt-8 rounded-[32px] border border-amber-200/80 bg-white p-6 shadow-soft">
          <div className="mx-auto w-fit rounded-[28px] border-2 border-amber-300/70 bg-cream-50 p-4">
            <div
              className="mx-auto"
              style={{ width: 300, height: 300 }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>

          <div className="mt-6 text-center">
            <p className="font-display text-2xl font-semibold text-bark-700">
              {cliente.nombre}
            </p>
            {cliente.codigoReferido ? (
              <p className="mt-2 text-sm text-bark-500">
                Código de referido{" "}
                <span className="font-mono font-semibold tracking-wide text-bark-700">
                  {cliente.codigoReferido}
                </span>
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-bark-100 bg-cream-50 px-4 py-3">
            <HuellitaIcon size={20} className="text-amber-600" />
            <span className="text-sm font-medium text-bark-600">
              Programa Huellitas
            </span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-bark-400">
          Si el local no puede escanear, pueden abrir{" "}
          <span className="font-mono text-bark-600">{scanUrl}</span>
        </p>
      </main>

      <MascotPointsFooter creditLabel="Producido por" className="print:hidden" />
    </div>
  );
}
