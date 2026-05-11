/**
 * Slug helpers para identificar locales en URLs / IDs de Firestore.
 *
 * Reglas:
 *  - lowercase, sin acentos, sin caracteres especiales.
 *  - palabras separadas por un único guión.
 *  - no empieza ni termina con guión.
 *  - mínimo 2, máximo 40 caracteres.
 *
 * El slug ES el doc-id de /Locales/{slug}, así que la unicidad la
 * garantiza Firestore por path.
 */

const MIN_LARGO = 2;
const MAX_LARGO = 40;

const RESERVADOS = new Set([
  "admin",
  "api",
  "auth",
  "cliente",
  "clientes",
  "dashboard",
  "huellitas",
  "login",
  "logout",
  "mi-cuenta",
  "onboarding",
  "registro",
  "verify"
]);

/**
 * Convierte un nombre arbitrario a un slug seguro.
 * Si el resultado queda vacío o muy corto, devuelve "".
 */
export function nombreASlug(nombre: string): string {
  if (!nombre) return "";
  const normalizado = nombre
    .normalize("NFD")
    // Eliminar combining marks (acentos) sin tocar la base.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // Reemplazar todo lo que no sea a-z 0-9 con guión
    .replace(/[^a-z0-9]+/g, "-")
    // Colapsar múltiples guiones
    .replace(/-+/g, "-")
    // Quitar guiones inicial / final
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LARGO);
  if (normalizado.length < MIN_LARGO) return "";
  return normalizado;
}

/** ¿Es un slug válido (estructura, largo, no reservado)? */
export function esSlugValido(slug: string): boolean {
  if (slug.length < MIN_LARGO || slug.length > MAX_LARGO) return false;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return false;
  if (RESERVADOS.has(slug)) return false;
  return true;
}

/**
 * Busca el primer slug disponible: si "mi-pet-shop" ya existe,
 * intenta "mi-pet-shop-2", "mi-pet-shop-3", ...
 *
 * `existe` es una función async que pregunta a Firestore si el slug
 * está tomado. Inyectable así esta lib se mantiene pura/testeable.
 */
export async function buscarSlugDisponible(
  base: string,
  existe: (slug: string) => Promise<boolean>,
  maxIntentos = 50
): Promise<string> {
  if (!esSlugValido(base)) {
    throw new Error(`Slug base inválido: "${base}"`);
  }
  if (!(await existe(base))) return base;
  for (let i = 2; i <= maxIntentos; i++) {
    const candidato = `${base}-${i}`.slice(0, MAX_LARGO);
    if (esSlugValido(candidato) && !(await existe(candidato))) return candidato;
  }
  throw new Error(
    `No se pudo encontrar un slug libre derivado de "${base}" en ${maxIntentos} intentos.`
  );
}
