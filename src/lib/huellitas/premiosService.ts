import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { PremioSchema, type Premio } from "./types";

export type PremioInput = {
  nombre: string;
  descripcion?: string;
  costoHuellitas: number;
  valorDescuento?: number | null;
  stock?: number | null;
  nivelMinimoId?: string | null;
  categoria?: Premio["categoria"];
  imagen?: string | null;
  activo?: boolean;
};

function normalizarImagenPremio(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (t.length === 0) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return t;
  } catch {
    return null;
  }
}

function mapDoc(id: string, data: Record<string, unknown>, localId: string): Premio {
  const valorDescuento =
    typeof data.valorDescuento === "number" && data.valorDescuento >= 0
      ? data.valorDescuento
      : undefined;
  return PremioSchema.parse({
    id,
    localId,
    nombre: data.nombre,
    descripcion: data.descripcion ?? "",
    costoHuellitas: data.costoHuellitas,
    valorDescuento,
    nivelMinimoId: data.nivelMinimoId ?? "cachorro",
    categoria: data.categoria ?? "otro",
    stock: data.stock ?? null,
    imagen: normalizarImagenPremio(data.imagen),
    activo: data.activo !== false,
    especiesObjetivo: Array.isArray(data.especiesObjetivo) ? data.especiesObjetivo : []
  });
}

export async function listarPremiosAdmin(localId: string): Promise<Premio[]> {
  const snap = await cols.premios(adminDb(), localId).get();
  return snap.docs
    .map((d) => mapDoc(d.id, d.data() as Record<string, unknown>, localId))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export async function obtenerPremio(
  localId: string,
  premioId: string
): Promise<Premio | null> {
  const snap = await cols.premios(adminDb(), localId).doc(premioId).get();
  if (!snap.exists) return null;
  return mapDoc(snap.id, snap.data() as Record<string, unknown>, localId);
}

export async function crearPremio(localId: string, input: PremioInput): Promise<Premio> {
  const ahora = Timestamp.now();
  const ref = cols.premios(adminDb(), localId).doc();
  const payload: Record<string, unknown> = {
    localId,
    nombre: input.nombre.trim(),
    descripcion: (input.descripcion ?? "").trim(),
    costoHuellitas: input.costoHuellitas,
    nivelMinimoId: input.nivelMinimoId?.trim() || "cachorro",
    categoria: input.categoria ?? "otro",
    stock: input.stock ?? null,
    activo: input.activo ?? true,
    especiesObjetivo: [],
    creadoEn: ahora,
    actualizadoEn: ahora
  };
  if (input.imagen !== undefined) {
    payload.imagen = input.imagen;
  }
  if (
    typeof input.valorDescuento === "number" &&
    Number.isFinite(input.valorDescuento) &&
    input.valorDescuento >= 0
  ) {
    payload.valorDescuento = input.valorDescuento;
  }
  PremioSchema.parse({ ...payload, id: ref.id });
  await ref.set(payload);
  return mapDoc(ref.id, payload, localId);
}

export async function actualizarPremio(
  localId: string,
  premioId: string,
  input: Partial<PremioInput>
): Promise<Premio> {
  const ref = cols.premios(adminDb(), localId).doc(premioId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Premio no encontrado en este local.");
  }

  const actual = snap.data() as Record<string, unknown>;
  if (actual.localId && actual.localId !== localId) {
    throw new Error("No podés editar premios de otro local.");
  }

  const patch: Record<string, unknown> = { actualizadoEn: Timestamp.now() };
  if (typeof input.nombre === "string") patch.nombre = input.nombre.trim();
  if (typeof input.descripcion === "string") patch.descripcion = input.descripcion.trim();
  if (typeof input.costoHuellitas === "number") patch.costoHuellitas = input.costoHuellitas;
  if (input.valorDescuento !== undefined) {
    if (input.valorDescuento === null) {
      patch.valorDescuento = null;
    } else if (
      typeof input.valorDescuento === "number" &&
      Number.isFinite(input.valorDescuento) &&
      input.valorDescuento >= 0
    ) {
      patch.valorDescuento = input.valorDescuento;
    }
  }
  if (input.nivelMinimoId !== undefined) {
    patch.nivelMinimoId = input.nivelMinimoId?.trim() || "cachorro";
  }
  if (input.categoria) patch.categoria = input.categoria;
  if (input.stock !== undefined) patch.stock = input.stock;
  if (input.imagen !== undefined) patch.imagen = input.imagen;
  if (typeof input.activo === "boolean") patch.activo = input.activo;

  await ref.set(patch, { merge: true });
  const merged = { ...actual, ...patch, localId };
  return mapDoc(premioId, merged, localId);
}

export async function eliminarPremio(localId: string, premioId: string): Promise<void> {
  const ref = cols.premios(adminDb(), localId).doc(premioId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data() as { localId?: string };
  if (data.localId && data.localId !== localId) {
    throw new Error("No podés borrar premios de otro local.");
  }
  await ref.delete();
}
