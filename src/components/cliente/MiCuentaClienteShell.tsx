import { CustomerPanel, type CustomerPanelProps } from "@/components/cliente/CustomerPanel";

type Props = Omit<CustomerPanelProps, "saldoHuellitas"> & {
  saldoDisponibleInicial: number;
};

/** Layout del portal cliente (dashboard sin catálogo embebido). */
export function MiCuentaClienteShell({
  saldoDisponibleInicial,
  ...panelProps
}: Props) {
  return (
    <CustomerPanel
      {...panelProps}
      saldoHuellitas={saldoDisponibleInicial}
    />
  );
}
