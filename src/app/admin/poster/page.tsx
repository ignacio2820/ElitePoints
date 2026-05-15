import { headers } from "next/headers";
import { Suspense } from "react";
import { PosterA4 } from "@/components/admin/PosterA4";
import { PosterAutoPrint } from "@/components/admin/PosterAutoPrint";
import { PosterPrintControls } from "@/components/admin/PosterPrintControls";
import { requireAdmin } from "@/lib/auth/server";
import { resolvePublicBaseUrl } from "@/lib/auth/continueUrl";
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
  const baseUrl = resolvePublicBaseUrl(h);
  const registroUrl = `${baseUrl}/registro?localId=${encodeURIComponent(localId)}`;

  return (
    <div className="poster-page">
      <Suspense fallback={null}>
        <PosterAutoPrint />
      </Suspense>
      <PosterPrintControls />
      <PosterA4
        nombreLocal={info.nombre}
        logoUrl={info.logoUrl}
        registroUrl={registroUrl}
      />
    </div>
  );
}
