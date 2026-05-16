import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardCumpleanos } from "@/components/admin/DashboardCumpleanos";
import { requireAdmin } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AdminCumpleanosPage() {
  const sesion = await requireAdmin();
  const localId = sesion.claims.localId;

  return (
    <div>
      <Link
        href="/admin"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 transition hover:text-bark-700"
      >
        <ArrowLeft size={14} />
        Volver al dashboard
      </Link>

      <DashboardCumpleanos localId={localId} />
    </div>
  );
}
