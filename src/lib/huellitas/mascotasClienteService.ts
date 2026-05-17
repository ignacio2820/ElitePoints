import { randomUUID } from "node:crypto";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import type { Especie, Mascota } from "@/lib/huellitas/types";

export type MascotaClienteInput = {
  nombre: string;
  especie?: Especie;
  fechaNacimiento: string;
  raza?: string;
  color?: string;
  pesoKg?: number;
};

export type MascotaClienteUpdate = {
  mascotaId: string;
  raza?: string;
  color?: string;
  pesoKg?: number;
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

function trimOpcional(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t ? t : undefined;
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

  const actuales = normalizarMascotas((snap.data() as { mascotas?: Mascota[] }).mascotas);
  if (actuales.length > 0) {
    throw new Error("Ya tenés una mascota registrada. Contactá al local para cambios.");
  }

  const especie = input.especie ?? "perro";
  const mascotaId = randomUUID();
  const mascota: Mascota = {
    id: mascotaId,
    nombre: input.nombre.trim(),
    tipo: especie,
    especie,
    fechaNacimiento: input.fechaNacimiento,
    fechaNacimientoBloqueada: true,
    raza: trimOpcional(input.raza),
    color: trimOpcional(input.color),
    pesoKg: input.pesoKg
  };

  const siguientes = [...actuales, mascota];

  await ref.set({ mascotas: siguientes }, { merge: true });
  await cols.mascota(db, localId, clienteId, mascotaId).set(mascota);

  return mascota;
}

/** Solo permite actualizar raza, color y peso (anti-fraude en nombre/fecha). */
export async function actualizarMascotaCliente(
  localId: string,
  clienteId: string,
  input: MascotaClienteUpdate
): Promise<Mascota> {
  const db = adminDb();
  const ref = cols.cliente(db, localId, clienteId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Cliente no encontrado");
  }

  const actuales = normalizarMascotas((snap.data() as { mascotas?: Mascota[] }).mascotas);
  const idx = actuales.findIndex((m) => m.id === input.mascotaId);
  if (idx < 0) {
    throw new Error("Mascota no encontrada");
  }

  const prev = actuales[idx]!;
  const actualizada: Mascota = {
    ...prev,
    raza: input.raza !== undefined ? trimOpcional(input.raza) : prev.raza,
    color: input.color !== undefined ? trimOpcional(input.color) : prev.color,
    pesoKg: input.pesoKg !== undefined ? input.pesoKg : prev.pesoKg
  };

  const siguientes = [...actuales];
  siguientes[idx] = actualizada;

  await ref.set({ mascotas: siguientes }, { merge: true });
  if (actualizada.id) {
    await cols.mascota(db, localId, clienteId, actualizada.id).set(actualizada);
  }

  return actualizada;
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
