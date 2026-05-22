import {
  Timestamp,
  type DocumentSnapshot,
  type Firestore,
  type Transaction
} from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { parseFechaFirestore } from "@/lib/huellitas/localService";
import {
  esPlanMembresia,
  MESES_POR_PLAN,
  type PlanMembresia
} from "@/lib/huellitas/membresia.shared";

export const COLECCION_ACTIVATION_TOKENS = "activation_tokens";

export type MotivoTokenInvalido =
  | "missing"
  | "not_found"
  | "used"
  | "expired"
  | "invalid_plan";

export interface ActivationTokenValido {
  token: string;
  name: string;
  plan: PlanMembresia;
  expiresAt: Date;
}

export function sumarMesesDesdeHoy(meses: number): Date {
  const vencimiento = new Date();
  vencimiento.setMonth(vencimiento.getMonth() + meses);
  return vencimiento;
}

export function fechaVencimientoPorPlan(plan: PlanMembresia): Date {
  return sumarMesesDesdeHoy(MESES_POR_PLAN[plan]);
}

function refToken(db: Firestore, token: string) {
  return db.collection(COLECCION_ACTIVATION_TOKENS).doc(token);
}

export async function leerActivationToken(
  token: string
): Promise<ActivationTokenValido | MotivoTokenInvalido> {
  const id = token.trim();
  if (!id) return "missing";

  const snap = await refToken(adminDb(), id).get();
  if (!snap.exists) return "not_found";

  const data = snap.data() ?? {};
  if (data.used === true) return "used";

  const expiresAt = parseFechaFirestore(data.expiresAt);
  if (!expiresAt || expiresAt.getTime() <= Date.now()) return "expired";

  const planRaw = typeof data.plan === "string" ? data.plan.trim() : "";
  if (!esPlanMembresia(planRaw)) return "invalid_plan";

  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) return "invalid_plan";

  return {
    token: id,
    name,
    plan: planRaw,
    expiresAt
  };
}

export function mensajeMotivoToken(motivo: MotivoTokenInvalido): string {
  switch (motivo) {
    case "missing":
      return "Acceso restringido. Necesitás un enlace de activación válido.";
    case "not_found":
    case "used":
    case "expired":
      return "El enlace de activación ha expirado o ya fue utilizado.";
    case "invalid_plan":
      return "El enlace de activación no es válido. Contactá a soporte.";
    default:
      return "No se pudo validar el enlace de activación.";
  }
}

/**
 * Marca el token como usado dentro de una transacción ya abierta.
 * Debe llamarse después de validar el snapshot del token en la misma transacción.
 */
export function marcarTokenUsadoEnTransaccion(
  tx: Transaction,
  db: Firestore,
  token: string,
  localId: string,
  tokenSnap: DocumentSnapshot
): ActivationTokenValido {
  const data = tokenSnap.data() ?? {};
  if (data.used === true) {
    throw new Error("TOKEN_USED");
  }

  const expiresAt = parseFechaFirestore(data.expiresAt);
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    throw new Error("TOKEN_EXPIRED");
  }

  const planRaw = typeof data.plan === "string" ? data.plan.trim() : "";
  if (!esPlanMembresia(planRaw)) {
    throw new Error("TOKEN_INVALID");
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) {
    throw new Error("TOKEN_INVALID");
  }

  const ahora = Timestamp.now();
  tx.set(
    refToken(db, token),
    {
      used: true,
      usedAt: ahora,
      localId
    },
    { merge: true }
  );

  return { token, name, plan: planRaw, expiresAt };
}
