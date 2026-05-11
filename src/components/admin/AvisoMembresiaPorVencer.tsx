import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function AvisoMembresiaPorVencer({
  diasRestantes,
  fechaVencimiento
}: {
  diasRestantes: number;
  fechaVencimiento: string;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold">Tu membresía vence pronto</p>
            <p className="mt-1 leading-relaxed text-amber-900/90">
              Quedan <strong>{diasRestantes}</strong> día
              {diasRestantes === 1 ? "" : "s"} (vence el {fechaVencimiento}).
              Renová para seguir usando Caja y Clientes sin interrupciones.
            </p>
          </div>
        </div>
        <Link href="/admin/pagos" className="btn-primary shrink-0">
          Renovar ahora
        </Link>
      </div>
    </div>
  );
}
