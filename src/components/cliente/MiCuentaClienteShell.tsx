"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerPanel, type CustomerPanelProps } from "@/components/cliente/CustomerPanel";
import { CanjesDisponibles } from "@/components/cliente/CanjesDisponibles";
import type { Premio } from "@/lib/huellitas/types";
import type { NivelLealtad } from "@/lib/huellitas/types";

type Props = Omit<CustomerPanelProps, "saldoHuellitas" | "recompensas"> & {
  saldoDisponibleInicial: number;
  premios: Premio[];
  valorMonetarioHuellita: number;
  nivelCliente: NivelLealtad;
  niveles: NivelLealtad[];
  especiesCliente?: string[];
  bannerInicio?: React.ReactNode;
};

export function MiCuentaClienteShell({
  saldoDisponibleInicial,
  premios,
  valorMonetarioHuellita,
  nivelCliente,
  niveles,
  especiesCliente,
  bannerInicio,
  ...panelProps
}: Props) {
  const router = useRouter();
  const [saldoDisponible, setSaldoDisponible] = useState(saldoDisponibleInicial);
  const [huellitasReservadas, setHuellitasReservadas] = useState(
    panelProps.huellitasReservadas ?? 0
  );

  const onCanjeExitoso = useCallback(
    (nuevoSaldo: number, costoHuellitas: number) => {
      setSaldoDisponible(nuevoSaldo);
      setHuellitasReservadas((r) => r + costoHuellitas);
      router.refresh();
    },
    [router]
  );

  return (
    <CustomerPanel
      {...panelProps}
      bannerInicio={bannerInicio}
      saldoHuellitas={saldoDisponible}
      huellitasReservadas={huellitasReservadas}
      valorMonetarioHuellita={valorMonetarioHuellita}
      recompensas={
        premios.length > 0 ? (
          <CanjesDisponibles
            embedded
            premios={premios}
            saldoCliente={saldoDisponible}
            valorMonetarioHuellita={valorMonetarioHuellita}
            nivelCliente={nivelCliente}
            niveles={niveles}
            especiesCliente={especiesCliente}
            onCanjeExitoso={onCanjeExitoso}
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-bark-100 bg-cream-50 px-4 py-8 text-center text-sm text-bark-500">
            Todavía no hay premios disponibles.
          </p>
        )
      }
    />
  );
}
