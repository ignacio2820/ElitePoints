import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";

export interface InfoLocal {
  id: string;
  nombre: string;
  telefonoWhatsapp?: string;
  email?: string;
  direccion?: string;
}

export async function getInfoLocal(localId: string): Promise<InfoLocal> {
  const db = adminDb();
  const snap = await cols.local(db, localId).get();
  const data = (snap.data() ?? {}) as Partial<InfoLocal>;
  return {
    id: localId,
    nombre: data.nombre ?? localId,
    telefonoWhatsapp: data.telefonoWhatsapp,
    email: data.email,
    direccion: data.direccion
  };
}

/** Actualiza datos públicos del local (merge). Sólo callable desde admin. */
export async function setInfoLocal(
  localId: string,
  patch: Partial<Pick<InfoLocal, "nombre" | "telefonoWhatsapp" | "email" | "direccion">>
): Promise<void> {
  const db = adminDb();
  const update: Record<string, unknown> = {};
  if (typeof patch.nombre === "string") update.nombre = patch.nombre.trim();
  if (typeof patch.telefonoWhatsapp === "string") {
    update.telefonoWhatsapp = patch.telefonoWhatsapp.replace(/[^0-9]/g, "");
  }
  if (typeof patch.email === "string") update.email = patch.email.trim();
  if (typeof patch.direccion === "string") update.direccion = patch.direccion.trim();
  if (Object.keys(update).length === 0) return;
  await cols.local(db, localId).set(update, { merge: true });
}
