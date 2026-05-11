import { AlertTriangle } from "lucide-react";

export function AvisoMembresiaExpiradaCliente({
  nombreLocal
}: {
  nombreLocal: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-soft">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
        <div>
          <p className="font-semibold text-amber-950">
            Programa de fidelidad en pausa
          </p>
          <p className="mt-1 leading-relaxed text-amber-900/90">
            La membresía de <strong>{nombreLocal}</strong> está vencida. Podés
            seguir viendo tu saldo, pero los canjes y nuevas acreditaciones
            quedan suspendidos hasta que el local reactive su plan.
          </p>
        </div>
      </div>
    </div>
  );
}
