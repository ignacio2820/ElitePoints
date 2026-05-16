import { describe, expect, it } from "vitest";
import {
  diasHastaProximoCumple,
  estaEnVentanaProximosCumpleanos
} from "./cumpleanosProximos";

describe("diasHastaProximoCumple", () => {
  it("devuelve 0 si el cumple es hoy", () => {
    expect(
      diasHastaProximoCumple("2020-06-15", new Date("2026-06-15T15:00:00"))
    ).toBe(0);
  });

  it("calcula días hasta el próximo cumple en el mismo año", () => {
    expect(
      diasHastaProximoCumple("2020-08-10", new Date("2026-06-15T12:00:00"))
    ).toBe(56);
  });

  it("pasa al año siguiente si el cumple ya pasó", () => {
    expect(
      diasHastaProximoCumple("2020-01-10", new Date("2026-06-15T12:00:00"))
    ).toBe(209);
  });

  it("ajusta 29-feb en año no bisiesto", () => {
    const dias = diasHastaProximoCumple(
      "2020-02-29",
      new Date("2027-02-20T12:00:00")
    );
    expect(dias).toBe(8);
  });
});

describe("estaEnVentanaProximosCumpleanos", () => {
  it("ventana 7–30 por defecto", () => {
    expect(estaEnVentanaProximosCumpleanos(6)).toBe(false);
    expect(estaEnVentanaProximosCumpleanos(7)).toBe(true);
    expect(estaEnVentanaProximosCumpleanos(30)).toBe(true);
    expect(estaEnVentanaProximosCumpleanos(31)).toBe(false);
  });

  it("ventana esta semana 0–6", () => {
    expect(estaEnVentanaProximosCumpleanos(0, 0, 6)).toBe(true);
    expect(estaEnVentanaProximosCumpleanos(6, 0, 6)).toBe(true);
    expect(estaEnVentanaProximosCumpleanos(7, 0, 6)).toBe(false);
  });
});
