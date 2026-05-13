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
    <div className="mb-6 rounded-3xl border border-terracotta-200 bg-terracotta-50 px-5 py-4 text-sm text-bark-700 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0 text-terracotta-500"
          />
          <div>
            <p className="font-bold text-bark-700">Tu membresía vence pronto</p>
            <p className="mt-1 leading-relaxed text-bark-600">
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
