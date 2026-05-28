import { PuntoIcon, PuntosStack } from "@/components/PuntoIcon";
import { formatARS, formatNumber } from "@/lib/utils";

/**
 * Hero de saldo del cliente.
 * "Tenés X Puntos (equivalen a $Y de descuento)"
 */
export function PuntosBalance({
  saldo,
  valorMonetarioHuellita,
  nombreCliente
}: {
  saldo: number;
  valorMonetarioHuellita: number;
  nombreCliente?: string;
}) {
  const equivalente = saldo * valorMonetarioHuellita;

  return (
    <div className="surface-card relative overflow-hidden p-8">
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-terracotta-100 opacity-70 blur-3xl" />
      <div className="absolute right-6 top-6 flex gap-1.5 opacity-25">
        <PuntoIcon size={32} className="text-bark-400 rotate-12" />
        <PuntoIcon size={20} className="text-bark-400 -rotate-6" />
      </div>

      <div className="relative">
        <div className="text-xs uppercase tracking-[0.2em] text-bark-400">
          {nombreCliente ? `Hola ${nombreCliente.split(" ")[0]},` : "Tu saldo"} tenés
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-4">
          <span className="font-display text-7xl font-semibold leading-none text-bark-700">
            {formatNumber(saldo)}
          </span>
          <span className="inline-flex items-center gap-2 pb-2 text-xl text-bark-500">
            <PuntoIcon size={24} className="text-bark-400" />
            Puntos
          </span>
        </div>

        <div className="mt-3 text-base text-bark-500">
          Equivalen a{" "}
          <strong className="text-bark-700">{formatARS(equivalente)}</strong> de
          descuento en tu próxima compra.
        </div>

        <PuntosStack count={Math.min(saldo, 6)} className="mt-7" size={24} />
      </div>
    </div>
  );
}

/** @deprecated Usar `PuntosBalance`. */
export const HuellitasBalance = PuntosBalance;
