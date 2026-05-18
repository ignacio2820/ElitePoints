import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { getSesion } from "@/lib/auth/server";
import { RUTA_PORTAL } from "@/lib/auth/redirect";
import { asegurarLocalIdEnRuta, rutaCliente } from "@/lib/huellitas/tenant";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { MascotPointsFooter } from "@/components/MascotPointsFooter";
import { formatHuellitas } from "@/lib/utils";
import { CredencialDigitalCliente } from "@/components/qr/CredencialDigitalCliente";
import { PantallaQrCliente } from "@/components/qr/PantallaQrCliente";
import type { Cliente } from "@/lib/huellitas/types";

function nombreMascotaPrincipal(cliente: Cliente | undefined): string | null {
  const mascotas = cliente?.mascotas;
  if (!Array.isArray(mascotas) || mascotas.length === 0) return null;
  const nombre = mascotas[0]?.nombre?.trim();
  return nombre || null;
}

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Mi QR — Huellitas"
};

export default async function MiQRPage({
  searchParams
}: {
  searchParams?: { localId?: string };
}) {
  const sesion = await getSesion();
  if (!sesion?.claims.clienteId) redirect("/login?intent=cliente");
  const { localId, clienteId } = sesion.claims;
  const rutaQr = `${RUTA_PORTAL}/qr`;
  const destino = asegurarLocalIdEnRuta(rutaQr, localId, searchParams?.localId);
  if (destino !== rutaCliente(rutaQr)) {
    redirect(destino);
  }
  if (searchParams?.localId) {
    redirect(rutaQr);
  }

  const db = adminDb();
  const [clienteSnap, localSnap] = await Promise.all([
    cols.cliente(db, localId, clienteId).get(),
    cols.local(db, localId).get()
  ]);

  const cliente = clienteSnap.data() as Cliente | undefined;
  const nombreMascota = nombreMascotaPrincipal(cliente);
  const nombreLocal =
    (localSnap.data() as { nombre?: string } | undefined)?.nombre ?? localId;

  return (
    <PantallaQrCliente>
      <header className="flex items-center justify-between border-b border-neutral-200 bg-[#FFFFFF] px-4 py-4">
        <Link
          href={RUTA_PORTAL}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-[#FFFFFF] text-bark-600"
        >
          <ArrowLeft size={18} />
        </Link>
        <p className="font-display text-lg font-semibold text-bark-700">
          Mi código QR
        </p>
        <div className="w-10" />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-5 py-6">
        <div className="w-full max-w-lg text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-bark-500">
            {nombreLocal}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-bark-800">
            {cliente?.nombre ?? "Cliente"}
          </h1>
          {nombreMascota ? (
            <p className="mt-1 text-sm text-bark-600">Mascota: {nombreMascota}</p>
          ) : null}

          <div className="mt-8 w-full max-w-full">
            <CredencialDigitalCliente clienteId={clienteId} qrSize={300} />
          </div>

          <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-[#FFFFFF] px-4 py-3">
            <HuellitaIcon size={24} className="text-terracotta-500" />
            <div className="text-left">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-bark-500">
                Tu saldo
              </p>
              <p className="font-display text-2xl font-bold tabular-nums text-bark-800">
                {formatHuellitas(cliente?.saldoHuellitas ?? 0)}
              </p>
            </div>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-bark-600">
            Subí el brillo al máximo. El local puede escanear el QR o el código
            de barras con su lector en caja para sumar Huellitas.
          </p>
          <MascotPointsFooter
            creditLabel="Producido por"
            className="mt-4 hidden border-0 px-0 py-3 print:block"
          />
        </div>
      </div>
    </PantallaQrCliente>
  );
}
