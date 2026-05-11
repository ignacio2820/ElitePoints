/**
 * Lógica PURA de canjes (tickets de retiro).
 *
 * Mantenida separada del servicio Firestore para testabilidad.
 */

import type { NivelLealtad, Premio } from "./types";

/** Alfabeto sin caracteres ambiguos (mismo que referidos). */
const ALFABETO_CANJE = "BCDFGHJKMNPQRSTWXYZ23456789";

/**
 * Genera un código corto humano-legible para un canje.
 * Default: 6 chars → ~387M combos. Verificación transaccional al persistir
 * evita colisiones si llegara a ocurrir.
 */
export function generarCodigoCanje(
  longitud = 6,
  rnd: () => number = Math.random
): string {
  let s = "";
  for (let i = 0; i < longitud; i++) {
    s += ALFABETO_CANJE[Math.floor(rnd() * ALFABETO_CANJE.length)];
  }
  return s;
}

/**
 * Calcula la fecha de expiración del ticket. Default: 24 horas.
 * Devuelve ISO 8601 (con tiempo).
 */
export function fechaExpiracionTicket(
  horasValidas = 24,
  ahora: Date = new Date()
): string {
  const d = new Date(ahora);
  d.setUTCHours(d.getUTCHours() + horasValidas);
  return d.toISOString();
}

/** True si el ISO está en el pasado respecto a `ahora`. */
export function tickectExpirado(
  expiraEnIso: string,
  ahora: Date = new Date()
): boolean {
  const exp = new Date(expiraEnIso);
  if (Number.isNaN(exp.getTime())) return true;
  return exp.getTime() <= ahora.getTime();
}

export interface ValidacionCanje {
  ok: boolean;
  motivo?: string;
}

/**
 * Verifica que un cliente con cierto saldo + nivel pueda canjear un premio.
 * Reglas:
 *  - Premio activo
 *  - Cliente tiene saldo >= costo
 *  - Cliente alcanzó nivel mínimo
 *  - Stock disponible (si está limitado)
 */
export function validarCanje(input: {
  premio: Premio;
  saldoCliente: number;
  nivelCliente: NivelLealtad;
  niveles: NivelLealtad[];
}): ValidacionCanje {
  const { premio, saldoCliente, nivelCliente, niveles } = input;

  if (premio.activo === false) {
    return { ok: false, motivo: "Este premio no está disponible." };
  }
  if (typeof premio.stock === "number" && premio.stock <= 0) {
    return { ok: false, motivo: "Este premio se agotó." };
  }
  if (saldoCliente < premio.costoHuellitas) {
    const faltan = premio.costoHuellitas - saldoCliente;
    return {
      ok: false,
      motivo: `Te faltan ${faltan} Huellitas para canjear este premio.`
    };
  }
  // Nivel mínimo
  const idxMin = niveles.findIndex((n) => n.id === premio.nivelMinimoId);
  const idxCli = niveles.findIndex((n) => n.id === nivelCliente.id);
  if (idxMin >= 0 && idxCli >= 0 && idxCli < idxMin) {
    const minNombre = niveles[idxMin]?.nombre ?? premio.nivelMinimoId;
    return {
      ok: false,
      motivo: `Necesitás ser ${minNombre} para canjear este premio.`
    };
  }
  return { ok: true };
}
