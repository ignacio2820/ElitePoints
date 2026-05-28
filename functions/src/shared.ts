import { randomUUID } from "node:crypto";
import * as admin from "firebase-admin";
import type { Firestore, DocumentReference } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";

if (!admin.apps.length) {
  admin.initializeApp();
} else {
  admin.app();
}

const firestoreDb = admin.firestore();
try {
  firestoreDb.settings({ ignoreUndefinedProperties: true });
} catch {
  // Firestore ya inicializado (warm start / runtime de Functions)
}

export const COLECCION_ACTIVATION_TOKENS = "activation_tokens";
export const COLECCION_LOCALES = "Locales";
export const DIAS_VALIDEZ_TOKEN = 7;

export const PLANES_VALIDOS = ["mensual", "semestral", "anual"] as const;
export type PlanMembresia = (typeof PLANES_VALIDOS)[number];

export const MESES_POR_PLAN: Record<PlanMembresia, number> = {
  mensual: 1,
  semestral: 6,
  anual: 12
};

export const ONBOARDING_BASE_URL =
  process.env.ONBOARDING_BASE_URL?.trim() ||
  "https://mascotpoints.webelitesolution.io/onboarding";

const ADMIN_SECRET_ENV = "MASCOTPOINTS_ADMIN_HTTP_SECRET";

/** Instancia única de Firestore (evita doble init en producción). */
export function db(): Firestore {
  return firestoreDb;
}

export function leerAdminSecret(): string {
  const secret = process.env[ADMIN_SECRET_ENV]?.trim();
  if (!secret) {
    throw new Error(
      `Falta la variable de entorno ${ADMIN_SECRET_ENV}. Configurala en Firebase (Secret Manager / variables de entorno de Functions).`
    );
  }
  return secret;
}

export function verificarSecret(provisto: string | undefined): boolean {
  try {
    const esperado = leerAdminSecret();
    if (!provisto?.trim()) return false;
    return provisto.trim() === esperado;
  } catch {
    return false;
  }
}

export function esPlanValido(value: string): value is PlanMembresia {
  return (PLANES_VALIDOS as readonly string[]).includes(value);
}

export function sumarMeses(base: Date, meses: number): Date {
  const vencimiento = new Date(base);
  vencimiento.setMonth(vencimiento.getMonth() + meses);
  return vencimiento;
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

export function formatearFechaEsAr(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Argentina/Buenos_Aires"
  });
}

export function queryParam(
  req: { query: Record<string, unknown> },
  key: string
): string | undefined {
  const raw = req.query[key];
  if (typeof raw === "string") return raw.trim() || undefined;
  if (Array.isArray(raw) && typeof raw[0] === "string") {
    return raw[0].trim() || undefined;
  }
  return undefined;
}

export function respuestaTexto(
  res: { status: (code: number) => { send: (body: string) => void } },
  status: number,
  body: string
): void {
  res.status(status).send(body);
}

type HttpResponse = {
  status: (code: number) => HttpResponse;
  set: (key: string, value: string) => HttpResponse;
  send: (body: string) => void;
};

export function respuestaHtml(
  res: HttpResponse,
  status: number,
  titulo: string,
  cuerpoHtml: string
): void {
  res.status(status);
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${titulo}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 1.25rem;
      background: #064e3b; color: #f8f9fa; line-height: 1.5; }
    .card { max-width: 28rem; margin: 0 auto; background: #fff; color: #1b4332;
      border-radius: 1rem; padding: 1.25rem 1.5rem; box-shadow: 0 12px 32px rgba(0,0,0,.2); }
    h1 { font-size: 1.25rem; margin: 0 0 .75rem; }
    p { margin: .5rem 0; font-size: .95rem; }
    strong { color: #064e3b; }
    .ok { color: #047857; }
    .err { color: #b91c1c; }
  </style>
</head>
<body>
  <div class="card">${cuerpoHtml}</div>
</body>
</html>`);
}

export function generarIdToken(): string {
  return randomUUID();
}

export function urlOnboarding(token: string): string {
  const base = ONBOARDING_BASE_URL.replace(/\/$/, "");
  return `${base}?token=${encodeURIComponent(token)}`;
}

/**
 * Resuelve un local por ID de documento (slug) o por nombre exacto en Firestore.
 */
export async function resolverRefLocal(
  firestore: Firestore,
  localParam: string
): Promise<
  | { ref: DocumentReference; localId: string; nombre: string }
  | { error: "not_found" }
  | { error: "ambiguous"; cantidad: number }
> {
  const trimmed = localParam.trim();
  if (!trimmed) return { error: "not_found" };

  const refPorId = firestore.collection(COLECCION_LOCALES).doc(trimmed);
  const snapId = await refPorId.get();
  if (snapId.exists) {
    const data = snapId.data() ?? {};
    const nombre =
      typeof data.nombre === "string" ? data.nombre.trim() : trimmed;
    return { ref: refPorId, localId: snapId.id, nombre };
  }

  const porNombre = await firestore
    .collection(COLECCION_LOCALES)
    .where("nombre", "==", trimmed)
    .limit(3)
    .get();

  if (porNombre.empty) return { error: "not_found" };
  if (porNombre.size > 1) {
    return { error: "ambiguous", cantidad: porNombre.size };
  }

  const doc = porNombre.docs[0];
  const data = doc.data();
  const nombre =
    typeof data.nombre === "string" ? data.nombre.trim() : trimmed;
  return { ref: doc.ref, localId: doc.id, nombre };
}

export interface RenovacionMembresiaResult {
  localId: string;
  nombre: string;
  plan: PlanMembresia;
  fechaVencimiento: Date;
  baseUsada: Date;
  renovoDesdeVigente: boolean;
}

/**
 * Calcula y persiste la nueva fecha de vencimiento dentro de una transacción.
 * Misma lógica que activarMembresiaSimulada en la app Next.js.
 */
export function calcularNuevaFechaVencimiento(
  fechaVencimientoActual: Date | undefined,
  plan: PlanMembresia,
  ahora = new Date()
): { fechaVencimiento: Date; baseUsada: Date; renovoDesdeVigente: boolean } {
  let base = ahora;
  let renovoDesdeVigente = false;

  if (fechaVencimientoActual && fechaVencimientoActual.getTime() > ahora.getTime()) {
    base = fechaVencimientoActual;
    renovoDesdeVigente = true;
  }

  const fechaVencimiento = sumarMeses(base, MESES_POR_PLAN[plan]);
  return { fechaVencimiento, baseUsada: base, renovoDesdeVigente };
}
