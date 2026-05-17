import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReportesAdminPanel } from "@/components/admin/reportes/ReportesAdminPanel";
import { requireAdmin } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AdminReportesPage() {
  await requireAdmin();

  return (
    <div>
      <Link
        href="/admin"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 transition hover:text-bark-700"
      >
        <ArrowLeft size={14} />
        Volver al dashboard
      </Link>

      <ReportesAdminPanel />
    </div>
  );
}
