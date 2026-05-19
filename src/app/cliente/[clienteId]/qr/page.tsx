import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requiereAccesoClientePublico } from "@/lib/auth/clientePortal";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { MascotPointsFooter } from "@/components/MascotPointsFooter";
import type { Cliente } from "@/lib/huellitas/types";
import { rutaConLocalId } from "@/lib/huellitas/tenant";
import { CredencialDigitalCliente } from "@/components/qr/CredencialDigitalCliente";
import { PantallaQrCliente } from "@/components/qr/PantallaQrCliente";

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

  await requiereAccesoClientePublico(localId, params.clienteId);

  const db = adminDb();
  const [clienteSnap, localSnap] = await Promise.all([
    cols.cliente(db, localId, params.clienteId).get(),
    cols.local(db, localId).get()
  ]);

  if (!clienteSnap.exists) notFound();

  const cliente = clienteSnap.data() as Cliente;
  const nombreLocal =
    (localSnap.data() as { nombre?: string } | undefined)?.nombre ?? localId;

  const volverHref = rutaConLocalId(`/cliente/${params.clienteId}`, localId);

  return (
    <PantallaQrCliente>
      <header className="border-b border-neutral-200 bg-[#FFFFFF]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link
            href={volverHref}
            className="inline-flex items-center gap-1.5 text-sm text-bark-600"
          >
            <ArrowLeft size={14} />
            Volver
          </Link>
          <div className="flex items-center gap-2">
            <HuellitaIcon size={22} className="text-terracotta-500" />
            <span className="font-display text-lg font-semibold text-bark-800">
              Huellitas
            </span>
          </div>
          <div className="w-14" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        <div className="text-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-bark-500">
            Tarjeta digital
          </span>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-bark-800">
            Tu tarjeta en{" "}
            <span className="text-terracotta-600">{nombreLocal}</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-bark-600">
            Elegí el modo según el lector del local. Subí el brillo al máximo.
          </p>
        </div>

        <div className="mt-8 w-full">
          <CredencialDigitalCliente
            clienteId={params.clienteId}
            telefono={cliente.telefono}
            dni={cliente.dni}
            qrSize={320}
          />
        </div>

        <div className="mt-6 text-center">
          <p className="font-display text-2xl font-semibold text-bark-800">
            {cliente.nombre}
          </p>
          {cliente.codigoReferido ? (
            <p className="mt-2 text-sm text-bark-600">
              Código de referido{" "}
              <span className="font-mono font-semibold text-bark-800">
                {cliente.codigoReferido}
              </span>
            </p>
          ) : null}
        </div>
      </main>

      <MascotPointsFooter creditLabel="Producido por" className="print:hidden" />
    </PantallaQrCliente>
  );
}
