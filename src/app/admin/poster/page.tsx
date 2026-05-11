import { headers } from "next/headers";
import { PosterA4 } from "@/components/admin/PosterA4";
import { PosterPrintControls } from "@/components/admin/PosterPrintControls";
import { requireAdmin } from "@/lib/auth/server";
import { getInfoLocal } from "@/lib/huellitas/localService";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Póster A4 — Huellitas"
};

export default async function AdminPosterPage() {
  const sesion = await requireAdmin();
  const localId = sesion.claims.localId;
  const info = await getInfoLocal(localId);

  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`
  ).replace(/\/$/, "");
  const registroUrl = `${baseUrl}/registro?localId=${encodeURIComponent(localId)}`;

  return (
    <div className="poster-page">
      <PosterPrintControls />
      <PosterA4
        nombreLocal={info.nombre}
        localId={localId}
        registroUrl={registroUrl}
      />
    </div>
  );
}
