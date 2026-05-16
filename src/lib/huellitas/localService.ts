import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { sanitizePublicEnvString } from "@/lib/firebase/storageBucket";
import { cols } from "@/lib/firebase/collections";
import { tieneAccesoOperativo, type PlanMembresia } from "./membresia.shared";

export interface InfoLocal {
  id: string;
  nombre: string;
  logoUrl?: string;
  telefonoWhatsapp?: string;
  email?: string;
  direccion?: string;
  estadoMembresia?: string;
  membresiaEstado?: string;
  membresiaPlan?: PlanMembresia;
  fechaVencimiento?: Date;
  trialHasta?: Date;
}

export function parseFechaFirestore(raw: unknown): Date | undefined {
  if (!raw) return undefined;
  if (raw instanceof Timestamp) return raw.toDate();
  if (raw instanceof Date) return raw;
  if (typeof raw === "string") {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (typeof raw === "object" && raw !== null && "toDate" in raw) {
    const toDate = (raw as { toDate: () => Date }).toDate;
    if (typeof toDate === "function") return toDate.call(raw);
  }
  return undefined;
}

export async function getInfoLocal(localId: string): Promise<InfoLocal> {
  const db = adminDb();
  const snap = await cols.local(db, localId).get();
  const data = (snap.data() ?? {}) as Record<string, unknown>;
  const rawLogo = data.logoUrl;
  const logoUrlLimpio =
    typeof rawLogo === "string"
      ? sanitizePublicEnvString(rawLogo) ?? rawLogo.trim()
      : undefined;

  const info: InfoLocal = {
    id: localId,
    nombre: (data.nombre as string | undefined) ?? localId,
    logoUrl: logoUrlLimpio || undefined,
    telefonoWhatsapp: data.telefonoWhatsapp as string | undefined,
    email: data.email as string | undefined,
    direccion: data.direccion as string | undefined,
    estadoMembresia: data.estadoMembresia as string | undefined,
    membresiaEstado: data.membresiaEstado as string | undefined,
    membresiaPlan: data.membresiaPlan as PlanMembresia | undefined,
    fechaVencimiento: parseFechaFirestore(data.fechaVencimiento),
    trialHasta: parseFechaFirestore(data.trialHasta)
  };

  return info;
}

export function membresiaActiva(info: InfoLocal): boolean {
  return tieneAccesoOperativo(info);
}

/** Actualiza datos públicos del local (merge). Sólo callable desde admin. */
export async function setInfoLocal(
  localId: string,
  patch: Partial<
    Pick<InfoLocal, "nombre" | "telefonoWhatsapp" | "email" | "direccion"> & {
      logoUrl?: string | null;
    }
  >
): Promise<void> {
  const db = adminDb();
  const update: Record<string, unknown> = {};
  if (typeof patch.nombre === "string") update.nombre = patch.nombre.trim();
  if (patch.logoUrl === null) {
    update.logoUrl = null;
  } else if (typeof patch.logoUrl === "string") {
    const logo =
      sanitizePublicEnvString(patch.logoUrl) ?? patch.logoUrl.trim();
    update.logoUrl = logo.length > 0 ? logo : null;
  }
  if (typeof patch.telefonoWhatsapp === "string") {
    update.telefonoWhatsapp = patch.telefonoWhatsapp.replace(/[^0-9]/g, "");
  }
  if (typeof patch.email === "string") update.email = patch.email.trim();
  if (typeof patch.direccion === "string") update.direccion = patch.direccion.trim();
  if (Object.keys(update).length === 0) return;
  await cols.local(db, localId).set(update, { merge: true });
}
