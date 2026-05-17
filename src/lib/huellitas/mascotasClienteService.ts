import { randomUUID } from "node:crypto";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import type { Especie, Mascota } from "@/lib/huellitas/types";

export type MascotaClienteInput = {
  nombre: string;
  especie?: Especie;
  fechaNacimiento: string;
};

function normalizarMascotas(raw: unknown): Mascota[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is Mascota =>
      !!m &&
      typeof m === "object" &&
      typeof (m as Mascota).nombre === "string" &&
      (m as Mascota).nombre.trim().length > 0
  );
}

export async function listarMascotasCliente(
  localId: string,
  clienteId: string
): Promise<Mascota[]> {
  const db = adminDb();
  const snap = await cols.cliente(db, localId, clienteId).get();
  if (!snap.exists) return [];
  const data = snap.data() as { mascotas?: Mascota[] };
  return normalizarMascotas(data.mascotas);
}

export async function agregarMascotaCliente(
  localId: string,
  clienteId: string,
  input: MascotaClienteInput
): Promise<Mascota> {
  const db = adminDb();
  const ref = cols.cliente(db, localId, clienteId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Cliente no encontrado");
  }

  const mascotaId = randomUUID();
  const mascota: Mascota = {
    id: mascotaId,
    nombre: input.nombre.trim(),
    especie: input.especie ?? "perro",
    fechaNacimiento: input.fechaNacimiento,
    fechaNacimientoBloqueada: true
  };

  const actuales = normalizarMascotas((snap.data() as { mascotas?: Mascota[] }).mascotas);
  const siguientes = [...actuales, mascota];

  await ref.set({ mascotas: siguientes }, { merge: true });
  await cols.mascota(db, localId, clienteId, mascotaId).set(mascota);

  return mascota;
}

export async function eliminarMascotaCliente(
  localId: string,
  clienteId: string,
  mascotaId: string
): Promise<Mascota[]> {
  const db = adminDb();
  const ref = cols.cliente(db, localId, clienteId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Cliente no encontrado");
  }

  const actuales = normalizarMascotas((snap.data() as { mascotas?: Mascota[] }).mascotas);
  const siguientes = actuales.filter((m) => m.id !== mascotaId);

  await ref.set({ mascotas: siguientes }, { merge: true });

  const mascotaRef = cols.mascota(db, localId, clienteId, mascotaId);
  const mSnap = await mascotaRef.get();
  if (mSnap.exists) {
    await mascotaRef.delete();
  }

  return siguientes;
}
