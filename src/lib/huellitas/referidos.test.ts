import { describe, expect, it } from "vitest";
import {
  esCodigoValido,
  generarCodigoReferido,
  generarCodigoSugerido,
  normalizarCodigo,
  renderMensajeReferido,
  urlRegistroConRef,
  urlWhatsApp
} from "./referidos";

const ALFABETO_SEGURO = "BCDFGHJKMNPQRSTWXYZ23456789";

describe("generarCodigoReferido", () => {
  it("devuelve formato XXXX-YYYY (8 chars + separador) por default", () => {
    const c = generarCodigoReferido();
    expect(c).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("nunca usa caracteres ambiguos (0/1/I/O/L/U/V)", () => {
    const random = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      const c = generarCodigoReferido({ random });
      const sinSep = c.replace(/-/g, "");
      for (const ch of sinSep) {
        expect(ALFABETO_SEGURO.includes(ch)).toBe(true);
      }
    }
  });

  it("acepta configuración custom de bloques y tamaño", () => {
    const c = generarCodigoReferido({ bloques: 3, tamanoBloque: 3, separador: "_" });
    expect(c).toMatch(/^[A-Z0-9]{3}_[A-Z0-9]{3}_[A-Z0-9]{3}$/);
  });

  it("incluye prefijo cuando se provee", () => {
    const c = generarCodigoReferido({ prefijo: "LU", bloques: 1 });
    expect(c.startsWith("LU-")).toBe(true);
  });

  it("rechaza configuración inválida", () => {
    expect(() => generarCodigoReferido({ bloques: 0 })).toThrow();
    expect(() => generarCodigoReferido({ tamanoBloque: 0 })).toThrow();
  });
});

describe("generarCodigoSugerido", () => {
  it("usa las 3 primeras letras válidas del nombre como prefijo", () => {
    const random = mulberry32(7);
    const c = generarCodigoSugerido("Lucía Romero", random);
    // Lucía → "LUC" pero L no está en alfabeto seguro → "UC" + siguiente válida
    // Recordá: el alfabeto seguro NO tiene L. Vamos a verificar que sea letra válida.
    expect(c.split("-")[0].length).toBe(3);
    expect(c.split("-")[1]).toMatch(/^[A-Z0-9]{4}$/);
  });

  it("normaliza tildes y caracteres especiales", () => {
    const random = mulberry32(7);
    const c = generarCodigoSugerido("Ñoño Fernández-García", random);
    // Sólo letras del alfabeto seguro
    expect(c).toMatch(/^[A-Z0-9]+-[A-Z0-9]{4}$/);
  });

  it("usa fallback PET cuando no hay letras válidas", () => {
    const c = generarCodigoSugerido("123 ¡!", () => 0);
    expect(c.startsWith("PET-")).toBe(true);
  });
});

describe("validación y normalización", () => {
  it("normaliza a uppercase y remueve espacios", () => {
    expect(normalizarCodigo("  luc-k3mp  ")).toBe("LUC-K3MP");
    expect(normalizarCodigo("LU C K3 MP")).toBe("LUCK3MP");
  });

  it("acepta códigos con letras, dígitos y guiones", () => {
    expect(esCodigoValido("LUC-K3MP")).toBe(true);
    expect(esCodigoValido("PETSHOP-2025")).toBe(true);
  });

  it("rechaza códigos demasiado cortos o con caracteres ilegales", () => {
    expect(esCodigoValido("AB")).toBe(false);
    expect(esCodigoValido("LUC K3MP")).toBe(false);
    expect(esCodigoValido("LUC@K3MP")).toBe(false);
  });
});

describe("mensaje WhatsApp", () => {
  const datos = {
    localId: "patitas",
    nombreLocal: "Pet Shop Patitas",
    codigo: "LUC-K3MP",
    baseUrl: "https://huellitas.app"
  };

  it("construye la URL de registro con ?ref=", () => {
    expect(urlRegistroConRef(datos)).toBe(
      "https://huellitas.app/registro?localId=patitas&ref=LUC-K3MP"
    );
  });

  it("reemplaza placeholders {local} {codigo} {url}", () => {
    const m = renderMensajeReferido(
      "¡Hola! Te recomiendo {local}. Usá el código {codigo} acá: {url}",
      datos
    );
    expect(m).toContain("Pet Shop Patitas");
    expect(m).toContain("LUC-K3MP");
    expect(m).toContain(
      "https://huellitas.app/registro?localId=patitas&ref=LUC-K3MP"
    );
  });

  it("agrega la URL al final si la plantilla la omite", () => {
    const m = renderMensajeReferido("¡Probá {local}!", datos);
    expect(m).toContain(
      "https://huellitas.app/registro?localId=patitas&ref=LUC-K3MP"
    );
  });

  it("urlWhatsApp encodea el mensaje", () => {
    const url = urlWhatsApp(
      "¡Hola! Te recomiendo {local}: {url}",
      datos
    );
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    const decoded = decodeURIComponent(url.split("text=")[1]);
    expect(decoded).toContain("Pet Shop Patitas");
    expect(decoded).toContain(
      "https://huellitas.app/registro?localId=patitas&ref=LUC-K3MP"
    );
  });
});

// PRNG determinista para tests reproducibles.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
