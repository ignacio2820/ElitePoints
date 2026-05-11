/**
 * Código corto humano-amigable para identificar a un cliente en caja.
 *
 * Diseño:
 *  - 6 caracteres, mostrados con guión: "ABC-123"
 *  - Alfabeto SIN caracteres confusos: sacamos 0 / O, 1 / I / L, U.
 *    Esto evita errores al dictarlo o leerlo de un papel.
 *  - Combinatoria: ~30^6 ≈ 730 millones de variantes → más que suficiente
 *    por local. Si hay colisión, reintentamos con otro candidato.
 *  - El `codigoCliente` es DIFERENTE al `codigoReferido`. El de referidos
 *    está pensado para compartir links de invitación; éste es para que
 *    el cajero le pregunte rápido al cliente "¿cuál es tu código?".
 */

const ALFABETO = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // sin O, I, L, U, 0, 1
const LARGO = 6;

/** Devuelve un caracter aleatorio del alfabeto seguro. */
function caracterAleatorio(): string {
  const idx = Math.floor(Math.random() * ALFABETO.length);
  return ALFABETO[idx];
}

/** Genera un candidato sin formato (6 chars seguidos). */
function generarSinFormato(): string {
  let s = "";
  for (let i = 0; i < LARGO; i++) s += caracterAleatorio();
  return s;
}

/**
 * Devuelve el código en formato visual con guión (ej: "ABC-123").
 * Lo guardamos así en Firestore para que sea consistente en UI y backend.
 */
export function generarCodigoCliente(): string {
  const raw = generarSinFormato();
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

/**
 * Normaliza una entrada del usuario a la forma canónica "ABC-123":
 *  - elimina espacios, mayúsculas, puntos, guiones extra.
 *  - reinjecta un único guión entre los 3+3 chars.
 *  - devuelve "" si la entrada no tiene 6 caracteres válidos.
 */
export function normalizarCodigoCliente(input: string): string {
  if (!input) return "";
  const limpio = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    // Sustituciones tolerantes para los caracteres que quitamos del alfabeto
    // (si el usuario escribe "O" cuando es "0", lo mapeamos al char correcto).
    .replace(/O/g, "0")
    .replace(/I/g, "1")
    .replace(/L/g, "1")
    .replace(/U/g, "V");
  if (limpio.length !== LARGO) return "";
  return `${limpio.slice(0, 3)}-${limpio.slice(3)}`;
}

/**
 * ¿La entrada (cualquier formato) es un código de cliente válido?
 * Tolera mayúsculas, espacios y caracteres confusos.
 */
export function esCodigoClienteValido(input: string): boolean {
  return normalizarCodigoCliente(input) !== "";
}

/** Versión sin guión, útil como doc-id de Firestore. */
export function aDocId(codigo: string): string {
  return codigo.replace(/-/g, "");
}

/** Visual: "ABC-123" (idempotente con la entrada). */
export function aFormatoVisual(codigo: string): string {
  const sin = aDocId(codigo).toUpperCase();
  if (sin.length !== LARGO) return codigo;
  return `${sin.slice(0, 3)}-${sin.slice(3)}`;
}
