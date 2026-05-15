/**
 * Programa "Boca en Boca" — Referidos.
 *
 * Funciones PURAS, sin Firestore. La capa de servicio se encarga de
 * verificar unicidad transaccionalmente en la colección /Referidos.
 */

/**
 * Alfabeto sin caracteres ambiguos: nada de O/0, I/1/L, U/V, etc.
 * Esto evita errores cuando el cliente comparte el código por voz o por
 * captura. Resultado más legible y robusto.
 */
const ALFABETO = "BCDFGHJKMNPQRSTWXYZ23456789";

export interface OpcionesGenerarCodigo {
  /** Cantidad de bloques (default 2). */
  bloques?: number;
  /** Tamaño de cada bloque (default 4). */
  tamanoBloque?: number;
  /** Separador entre bloques (default "-"). */
  separador?: string;
  /** Prefijo opcional (ej. iniciales del cliente: "LU-XXXX-YYYY"). */
  prefijo?: string;
  /** RNG inyectable para tests (default Math.random). */
  random?: () => number;
}

/**
 * Genera un código de referido aleatorio.
 *
 * Espacio default: 27^8 ≈ 2.8 × 10^11 combinaciones (8 caracteres alfabeto seguro).
 * Más que suficiente para colisiones improbables, pero igualmente la capa
 * de persistencia hace verificación transaccional.
 */
export function generarCodigoReferido(opts: OpcionesGenerarCodigo = {}): string {
  const bloques = opts.bloques ?? 2;
  const tamano = opts.tamanoBloque ?? 4;
  const sep = opts.separador ?? "-";
  const rnd = opts.random ?? Math.random;

  if (bloques <= 0 || tamano <= 0) {
    throw new Error("bloques y tamanoBloque deben ser > 0");
  }

  const partes: string[] = [];
  for (let b = 0; b < bloques; b++) {
    let s = "";
    for (let i = 0; i < tamano; i++) {
      const idx = Math.floor(rnd() * ALFABETO.length);
      s += ALFABETO[idx];
    }
    partes.push(s);
  }

  const cuerpo = partes.join(sep);
  if (opts.prefijo) {
    return `${normalizarPrefijo(opts.prefijo)}${sep}${cuerpo}`;
  }
  return cuerpo;
}

/**
 * Genera un código sugerido a partir del nombre del cliente:
 * primeras 3 letras válidas del nombre + bloque aleatorio.
 * Ej.: "Lucía Romero" → "LUC-K3MP" (más memorable para compartir por voz).
 */
export function generarCodigoSugerido(
  nombre: string,
  random?: () => number
): string {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  // Filtrar a alfabeto seguro
  let prefijo = "";
  for (const ch of limpio) {
    if (ALFABETO.includes(ch)) {
      prefijo += ch;
      if (prefijo.length === 3) break;
    }
  }
  if (prefijo.length < 3) prefijo = "PET";

  return generarCodigoReferido({
    bloques: 1,
    tamanoBloque: 4,
    prefijo,
    random
  });
}

function normalizarPrefijo(p: string): string {
  const limpio = p
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  let salida = "";
  for (const ch of limpio) {
    if (ALFABETO.includes(ch) || /[A-Z0-9]/.test(ch)) salida += ch;
  }
  return salida.slice(0, 6) || "PET";
}

/**
 * Validación estricta: el código sólo puede contener letras/dígitos del
 * alfabeto seguro y guiones. Útil para sanitizar input del registro.
 */
export function esCodigoValido(codigo: string): boolean {
  if (!codigo) return false;
  if (codigo.length < 4 || codigo.length > 20) return false;
  return /^[A-Z0-9-]+$/.test(codigo);
}

/** Normaliza un código para lookup (uppercase, sin espacios). */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/\s+/g, "");
}

// ──────────────────────────────────────────────────────────────────────────────
// Mensaje WhatsApp / share link
// ──────────────────────────────────────────────────────────────────────────────

export interface DatosShare {
  localId: string;
  nombreLocal: string;
  codigo: string;
  baseUrl: string; // e.g. https://huellitas.app
}

/** Construye la URL canónica de registro con el código preseleccionado. */
export function urlRegistroConRef(d: DatosShare): string {
  const url = new URL("/acceso", d.baseUrl);
  url.searchParams.set("localId", d.localId);
  url.searchParams.set("ref", d.codigo);
  return url.toString();
}

/**
 * Reemplaza placeholders {local} {codigo} {url} en la plantilla de mensaje.
 * Si la plantilla no contiene {url} igual incluye la URL al final, así el
 * receptor siempre tiene un click directo al registro.
 */
export function renderMensajeReferido(
  plantilla: string,
  d: DatosShare
): string {
  const url = urlRegistroConRef(d);
  let texto = plantilla
    .replaceAll("{local}", d.nombreLocal)
    .replaceAll("{codigo}", d.codigo)
    .replaceAll("{url}", url);

  if (!texto.includes(url)) {
    texto = `${texto.trim()}\n${url}`;
  }
  return texto;
}

/** Devuelve el href para wa.me con el mensaje ya codificado. */
export function urlWhatsApp(plantilla: string, d: DatosShare): string {
  const texto = renderMensajeReferido(plantilla, d);
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
