import { randomUUID } from "node:crypto";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import type { Especie, Mascota } from "@/lib/huellitas/types";
import {
  eliminarMascotaCliente,
  type MascotaClienteInput
} from "@/lib/huellitas/mascotasClienteService";

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

function mascotaConTipo(
  base: Omit<Mascota, "tipo"> & { especie: Especie; tipo?: string }
): Mascota {
  const especie = base.especie;
  return {
    ...base,
    tipo: base.tipo ?? especie,
    especie
  };
}

async function persistirMascotas(
  localId: string,
  clienteId: string,
  mascotas: Mascota[]
): Promise<void> {
  const db = adminDb();
  const ref = cols.cliente(db, localId, clienteId);
  await ref.set({ mascotas }, { merge: true });

  for (const m of mascotas) {
    if (!m.id) continue;
    await cols.mascota(db, localId, clienteId, m.id).set(m);
  }
}

export async function agregarMascotaAdmin(
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

  const especie = input.especie ?? "perro";
  const mascotaId = randomUUID();
  const mascota = mascotaConTipo({
    id: mascotaId,
    nombre: input.nombre.trim(),
    especie,
    tipo: especie,
    fechaNacimiento: input.fechaNacimiento,
    fechaNacimientoBloqueada: true,
    raza: trimOpcional(input.raza),
    color: trimOpcional(input.color),
    pesoKg: input.pesoKg
  });

  const actuales = normalizarMascotas((snap.data() as { mascotas?: Mascota[] }).mascotas);
  const siguientes = [...actuales, mascota];
  await persistirMascotas(localId, clienteId, siguientes);
  return mascota;
}

export type MascotaAdminUpdate = {
  mascotaId: string;
  nombre?: string;
  especie?: Especie;
  fechaNacimiento?: string;
  raza?: string;
  color?: string;
  pesoKg?: number;
};

export async function actualizarMascotaAdmin(
  localId: string,
  clienteId: string,
  input: MascotaAdminUpdate
): Promise<Mascota[]> {
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
  const especie = input.especie ?? prev.especie;
  const actualizada = mascotaConTipo({
    ...prev,
    nombre: input.nombre?.trim() ?? prev.nombre,
    especie,
    tipo: especie,
    fechaNacimiento: input.fechaNacimiento ?? prev.fechaNacimiento,
    raza: input.raza !== undefined ? trimOpcional(input.raza) : prev.raza,
    color: input.color !== undefined ? trimOpcional(input.color) : prev.color,
    pesoKg: input.pesoKg !== undefined ? input.pesoKg : prev.pesoKg
  });

  const siguientes = [...actuales];
  siguientes[idx] = actualizada;
  await persistirMascotas(localId, clienteId, siguientes);
  return siguientes;
}

export async function eliminarMascotaAdmin(
  localId: string,
  clienteId: string,
  mascotaId: string
): Promise<Mascota[]> {
  return eliminarMascotaCliente(localId, clienteId, mascotaId);
}
