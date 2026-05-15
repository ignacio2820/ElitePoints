import Link from "next/link";
import { getInfoLocal } from "@/lib/huellitas/localService";
import { normalizarCodigo } from "@/lib/huellitas/referidos";
import { AccesoInteligente } from "@/components/landing/AccesoInteligente";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Acceso — MascotPoints"
};

export default async function AccesoPage({
  searchParams
}: {
  searchParams: { localId?: string; ref?: string };
}) {
  const localId = searchParams.localId?.trim() || "";
  if (!localId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0b] px-6 text-center text-zinc-300">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">
            Link incompleto
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Escaneá el QR del local o pedile el enlace con su identificador.
          </p>
          <Link
            href="/"
            className="webelite-btn-secondary mt-8 inline-flex px-6 py-3 text-sm"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  const info = await getInfoLocal(localId);
  const codigoRef = searchParams.ref ? normalizarCodigo(searchParams.ref) : "";

  return (
    <AccesoInteligente
      localId={localId}
      nombreLocal={info.nombre}
      logoUrl={info.logoUrl}
      codigoRef={codigoRef || undefined}
    />
  );
}
