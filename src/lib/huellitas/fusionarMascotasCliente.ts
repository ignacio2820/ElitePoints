import type { Mascota } from "@/lib/huellitas/types";

/**
 * Une mascotas del array embebido en Cliente con la subcolección Mascotas (sin duplicar por id).
 */
export function fusionarMascotasCliente(
  embebidas: Mascota[] | undefined,
  subcoleccion: Mascota[]
): Mascota[] {
  const map = new Map<string, Mascota>();

  (embebidas ?? []).forEach((m, idx) => {
    if (!m?.nombre?.trim()) return;
    const id = m.id ?? `emb-${idx}-${m.nombre}`;
    map.set(id, { ...m, id });
  });

  for (const m of subcoleccion) {
    if (!m?.nombre?.trim()) continue;
    const id = m.id ?? m.nombre;
    const prev = map.get(id);
    map.set(id, prev ? { ...prev, ...m, id } : { ...m, id });
  }

  return Array.from(map.values());
}
