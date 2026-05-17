import type { Especie } from "@/lib/huellitas/types";

/** Valores guardados en Firestore (`tipo` y `especie`). */
export const TIPOS_MASCOTA = [
  { value: "perro", label: "Perro" },
  { value: "gato", label: "Gato" },
  { value: "ave", label: "Ave" },
  { value: "roedor", label: "Roedor" },
  { value: "reptil", label: "Reptil" },
  { value: "otro", label: "Otro" }
] as const;

export type TipoMascotaValor = (typeof TIPOS_MASCOTA)[number]["value"];

export function labelTipoMascota(tipo: string | undefined, especie?: Especie): string {
  const key = (tipo ?? especie ?? "otro") as TipoMascotaValor;
  return TIPOS_MASCOTA.find((t) => t.value === key)?.label ?? "Otro";
}

export function resolverEspecieMascota(m: {
  tipo?: string;
  especie?: Especie;
}): Especie {
  const raw = m.tipo ?? m.especie ?? "perro";
  if (TIPOS_MASCOTA.some((t) => t.value === raw)) {
    return raw as Especie;
  }
  return "otro";
}
