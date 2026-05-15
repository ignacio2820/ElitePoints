import Link from "next/link";
import { getInfoLocal } from "@/lib/huellitas/localService";
import { normalizarCodigo } from "@/lib/huellitas/referidos";
import { AccesoClienteLanding } from "@/components/acceso/AccesoClienteLanding";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Acceso — Huellitas"
};

export default async function AccesoPage({
  searchParams
}: {
  searchParams: { localId?: string; ref?: string };
}) {
  const localId = searchParams.localId?.trim() || "";
  if (!localId) {
    return (
      <main className="paw-bg min-h-screen">
        <section className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="font-display text-3xl font-semibold text-white">
            Link incompleto
          </h1>
          <p className="mt-3 text-sm text-bark-100">
            Escaneá el QR del local o pedile el enlace con su identificador.
          </p>
          <Link href="/" className="btn-primary mt-8 inline-flex">
            Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  const info = await getInfoLocal(localId);
  const codigoRef = searchParams.ref ? normalizarCodigo(searchParams.ref) : "";

  return (
    <AccesoClienteLanding
      localId={localId}
      nombreLocal={info.nombre}
      logoUrl={info.logoUrl}
      codigoRef={codigoRef || undefined}
    />
  );
}
