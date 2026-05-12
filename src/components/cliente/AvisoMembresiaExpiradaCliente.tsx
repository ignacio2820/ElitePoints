import { AlertTriangle } from "lucide-react";

export function AvisoMembresiaExpiradaCliente({
  nombreLocal
}: {
  nombreLocal: string;
}) {
  return (
    <div className="surface-card rounded-2xl border border-terracotta-200 bg-terracotta-50/80 px-4 py-3 text-sm text-bark-800">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-terracotta-500" />
        <div>
          <p className="font-display font-semibold text-bark-700">
            Programa de fidelidad en pausa
          </p>
          <p className="mt-1 leading-relaxed text-bark-600">
            La membresía de <strong>{nombreLocal}</strong> está vencida. Podés
            seguir viendo tu saldo, pero los canjes y nuevas acreditaciones
            quedan suspendidos hasta que el local reactive su plan.
          </p>
        </div>
      </div>
    </div>
  );
}
