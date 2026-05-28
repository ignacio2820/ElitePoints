"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PuntoIcon } from "@/components/PuntoIcon";
import { CanjesDisponibles } from "@/components/cliente/CanjesDisponibles";
import type { NivelLealtad, Premio } from "@/lib/huellitas/types";
import { formatHuellitas, formatNumber } from "@/lib/utils";

interface Props {
  saldoDisponibleInicial: number;
  huellitasReservadas: number;
  premios: Premio[];
  valorMonetarioHuellita: number;
  nivelCliente: NivelLealtad;
  niveles: NivelLealtad[];
}

export function CatalogoClienteCanjes({
  saldoDisponibleInicial,
  huellitasReservadas,
  premios,
  valorMonetarioHuellita,
  nivelCliente,
  niveles
}: Props) {
  const router = useRouter();
  const [saldoDisponible, setSaldoDisponible] = useState(saldoDisponibleInicial);
  const [reservadas, setReservadas] = useState(huellitasReservadas);

  const onCanjeExitoso = useCallback(
    (nuevoSaldo: number, costoHuellitas: number) => {
      setSaldoDisponible(nuevoSaldo);
      setReservadas((r) => r + costoHuellitas);
      router.refresh();
    },
    [router]
  );

  return (
    <>
      <div className="mb-6 rounded-2xl bg-emerald-800 p-5 text-white shadow-soft ring-1 ring-emerald-700/40">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
          Tu saldo disponible
        </p>
        <div className="mt-2 flex items-end gap-2">
          <span className="font-display text-4xl font-extrabold tabular-nums text-terracotta-300">
            {formatHuellitas(saldoDisponible)}
          </span>
          <span className="pb-1 text-sm font-semibold text-white/85">Puntos</span>
        </div>
        {reservadas > 0 ? (
          <p className="mt-2 text-xs text-white/75">
            {formatNumber(reservadas)} reservadas en canjes pendientes
          </p>
        ) : null}
        <p className="mt-3 flex items-center gap-1.5 text-sm text-white/80">
          <PuntoIcon size={14} className="text-terracotta-300" />
          Elegí un premio y generá tu cupón para mostrar en caja.
        </p>
      </div>

      <CanjesDisponibles
        layout="catalog"
        premios={premios}
        saldoCliente={saldoDisponible}
        valorMonetarioHuellita={valorMonetarioHuellita}
        nivelCliente={nivelCliente}
        niveles={niveles}
        onCanjeExitoso={onCanjeExitoso}
      />
    </>
  );
}
