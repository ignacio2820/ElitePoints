import { TIPOS_MASCOTA, type TipoMascotaValor } from "@/lib/huellitas/tiposMascota";

type Props = {
  id?: string;
  value: TipoMascotaValor;
  onChange: (value: TipoMascotaValor) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

export function SelectTipoMascota({
  id = "mascota-tipo",
  value,
  onChange,
  disabled,
  required = true,
  className = ""
}: Props) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as TipoMascotaValor)}
      disabled={disabled}
      required={required}
      className={
        className ||
        "mt-2 w-full rounded-xl border border-bark-200 bg-white px-3 py-2.5 text-sm text-bark-800 outline-none ring-terracotta-400/30 transition focus:border-terracotta-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-cream-50 disabled:text-bark-600"
      }
    >
      <option value="" disabled>
        Elegí el tipo
      </option>
      {TIPOS_MASCOTA.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </select>
  );
}
