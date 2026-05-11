import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { getSesion } from "@/lib/auth/server";
import { HuellitaIcon } from "@/components/HuellitaIcon";
import { formatNumber } from "@/lib/utils";
import type { Cliente } from "@/lib/huellitas/types";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Mi QR — Huellitas"
};

export default async function MiQRPage() {
  const sesion = await getSesion();
  if (!sesion?.claims.clienteId) redirect("/login?intent=cliente");
  const { localId, clienteId } = sesion.claims;

  const db = adminDb();
  const [clienteSnap, localSnap] = await Promise.all([
    cols.cliente(db, localId, clienteId).get(),
    cols.local(db, localId).get()
  ]);

  const cliente = clienteSnap.data() as Cliente | undefined;
  const nombreLocal =
    (localSnap.data() as { nombre?: string } | undefined)?.nombre ?? localId;

  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;
  const qrUrl = `${baseUrl}/admin/scan/${clienteId}`;

  const qrSvg = await QRCode.toString(qrUrl, {
    type: "svg",
    margin: 1,
    color: { dark: "#221308", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
    width: 320
  });

  return (
    <div className="flex min-h-screen flex-col bg-cream-50">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-4">
        <Link
          href="/mi-cuenta"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-bark-600 shadow-sm transition hover:bg-cream-100"
        >
          <ArrowLeft size={18} />
        </Link>
        <p className="font-display text-lg font-semibold text-bark-700">
          Mi código QR
        </p>
        <div className="w-10" />
      </header>

      {/* QR Card */}
      <div className="flex flex-1 items-center justify-center px-5 py-4">
        <div className="w-full max-w-sm">
          <div className="relative rounded-[36px] bg-gradient-to-br from-bark-700 via-bark-600 to-terracotta-500 p-1.5 shadow-[0_25px_60px_-15px_rgba(60,40,20,0.45)]">
            <div className="rounded-[30px] bg-white p-7 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-bark-400">
                {nombreLocal}
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold text-bark-700">
                {cliente?.nombre ?? "Cliente"}
              </h1>

              <div
                className="mx-auto mt-6 rounded-2xl border-[3px] border-bark-700/10 bg-white p-2"
                style={{ width: 320 + 24, height: 320 + 24 }}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />

              <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl bg-cream-50 px-4 py-3">
                <HuellitaIcon size={24} className="text-bark-500" />
                <div className="text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-bark-400">
                    Tu saldo
                  </p>
                  <p className="font-display text-2xl font-bold tabular-nums text-bark-700">
                    {formatNumber(cliente?.saldoHuellitas ?? 0)}
                    <span className="ml-1 text-sm font-medium text-bark-400">
                      Huellitas
                    </span>
                  </p>
                </div>
              </div>

              {cliente?.codigoReferido && (
                <p className="mt-4 text-[11px] uppercase tracking-widest text-bark-300">
                  Código: <span className="font-mono text-bark-500">{cliente.codigoReferido}</span>
                </p>
              )}
            </div>

            {/* Decorative pet badge */}
            <div className="absolute -top-4 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-bark-700 to-terracotta-500 ring-4 ring-cream-50">
              <HuellitaIcon size={22} className="text-cream-50" />
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-bark-400">
            Mostrale esta pantalla al local para que sume tus Huellitas.
          </p>
        </div>
      </div>
    </div>
  );
}
