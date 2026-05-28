import { describe, expect, it } from "vitest";
import {
  aumentarCatalogo,
  calcularCanje,
  calcularEmision,
  calcularNivel,
  diagnosticarPrograma,
  edadMascotaAnios,
  esCumpleanos,
  esMesCumpleanos,
  esLoteVigente,
  planConsumoFIFO,
  progresoNivel,
  saldoVigente
} from "./engine";
import {
  NIVELES_DEFAULT,
  type LoteHuellitas,
  type Premio
} from "./types";

const cfgBase = {
  montoParaUnaHuellita: 1000,
  valorMonetarioHuellita: 10,
  diasVencimiento: 365
};

describe("calcularEmision", () => {
  it("aplica Math.floor estricto (no redondea hacia arriba)", () => {
    const r = calcularEmision(2999, cfgBase, new Date("2026-01-01T12:00:00Z"));
    expect(r.huellitasBase).toBe(2);
    expect(r.huellitasGeneradas).toBe(2); // multiplicador default = 1
    expect(r.resto).toBe(999);
  });

  it("emite 0 huellitas cuando el ticket es menor al monto", () => {
    expect(calcularEmision(500, cfgBase).huellitasGeneradas).toBe(0);
  });

  it("calcula fecha de vencimiento sumando diasVencimiento", () => {
    const r = calcularEmision(1000, cfgBase, new Date("2026-01-01T12:00:00Z"));
    expect(r.fechaVencimiento).toBe("2027-01-01");
  });

  it("rechaza totalVenta negativo o no finito", () => {
    expect(() => calcularEmision(-1, cfgBase)).toThrow();
    expect(() => calcularEmision(NaN, cfgBase)).toThrow();
  });

  it("rechaza montoParaUnaHuellita inválido (división por cero)", () => {
    expect(() =>
      calcularEmision(1000, { ...cfgBase, montoParaUnaHuellita: 0 })
    ).toThrow();
  });

  it("aplica multiplicador de Explorador (1.1x)", () => {
    const r = calcularEmision(10_000, cfgBase, new Date(), 1.1);
    expect(r.huellitasBase).toBe(10);
    expect(r.huellitasGeneradas).toBe(11);
  });

  it("aplica multiplicador de Gran Guardián (1.5x)", () => {
    const r = calcularEmision(10_000, cfgBase, new Date(), 1.5);
    expect(r.huellitasBase).toBe(10);
    expect(r.huellitasGeneradas).toBe(15);
  });

  it("redondea correctamente bases impares con 1.5x", () => {
    // base=3, 3*1.5 = 4.5 → round() = 5 (HALF_UP estándar de JS para .5 positivo)
    const r = calcularEmision(3000, cfgBase, new Date(), 1.5);
    expect(r.huellitasBase).toBe(3);
    expect(r.huellitasGeneradas).toBe(5);
  });

  it("rechaza multiplicador inválido", () => {
    expect(() => calcularEmision(1000, cfgBase, new Date(), 0)).toThrow();
    expect(() => calcularEmision(1000, cfgBase, new Date(), -1)).toThrow();
  });
});

describe("vencimiento y saldo", () => {
  const hoy = new Date("2026-06-01T12:00:00Z");
  const lotes: LoteHuellitas[] = [
    {
      id: "l1",
      clienteId: "c1",
      ventaId: "v1",
      huellitasIniciales: 50,
      huellitasRestantes: 50,
      fechaEmision: "2025-06-01",
      fechaVencimiento: "2026-05-30" // vencido
    },
    {
      id: "l2",
      clienteId: "c1",
      ventaId: "v2",
      huellitasIniciales: 30,
      huellitasRestantes: 30,
      fechaEmision: "2025-08-01",
      fechaVencimiento: "2026-08-01"
    },
    {
      id: "l3",
      clienteId: "c1",
      ventaId: "v3",
      huellitasIniciales: 20,
      huellitasRestantes: 0, // ya consumido
      fechaEmision: "2025-09-01",
      fechaVencimiento: "2026-09-01"
    }
  ];

  it("excluye lotes vencidos y agotados del saldo", () => {
    expect(saldoVigente(lotes, hoy)).toBe(30);
    expect(esLoteVigente(lotes[0], hoy)).toBe(false);
    expect(esLoteVigente(lotes[1], hoy)).toBe(true);
    expect(esLoteVigente(lotes[2], hoy)).toBe(false);
  });
});

describe("planConsumoFIFO", () => {
  const hoy = new Date("2026-06-01T12:00:00Z");
  const lotes: LoteHuellitas[] = [
    {
      id: "viejo",
      clienteId: "c",
      ventaId: "v",
      huellitasIniciales: 20,
      huellitasRestantes: 20,
      fechaEmision: "2025-07-01",
      fechaVencimiento: "2026-07-01"
    },
    {
      id: "nuevo",
      clienteId: "c",
      ventaId: "v",
      huellitasIniciales: 50,
      huellitasRestantes: 50,
      fechaEmision: "2025-12-01",
      fechaVencimiento: "2026-12-01"
    }
  ];

  it("consume primero el lote que vence antes", () => {
    const plan = planConsumoFIFO(lotes, 30, hoy);
    expect(plan).toEqual([
      { loteId: "viejo", consumidas: 20 },
      { loteId: "nuevo", consumidas: 10 }
    ]);
  });

  it("falla si el saldo no alcanza", () => {
    expect(() => planConsumoFIFO(lotes, 999, hoy)).toThrow(/Saldo insuficiente/);
  });
});

describe("calcularCanje", () => {
  const hoy = new Date("2026-06-01T12:00:00Z");
  const cfg = {
    valorMonetarioHuellita: 10,
    minimoHuellitasCanje: 10,
    topeDescuentoPorcentual: 0.5
  };
  const saldoLotes: LoteHuellitas[] = [
    {
      id: "l1",
      clienteId: "c",
      ventaId: "v",
      huellitasIniciales: 200,
      huellitasRestantes: 200,
      fechaEmision: "2025-12-01",
      fechaVencimiento: "2026-12-01"
    }
  ];

  it("aplica descuento sin tope cuando no se excede", () => {
    const r = calcularCanje(
      { totalVenta: 5000, huellitasSolicitadas: 50, saldoLotes, cfg },
      hoy
    );
    expect(r.descuento).toBe(500);
    expect(r.totalCobrado).toBe(4500);
    expect(r.huellitasCanjeadas).toBe(50);
  });

  it("respeta el topeDescuentoPorcentual y devuelve huellitas no consumidas", () => {
    const r = calcularCanje(
      { totalVenta: 1000, huellitasSolicitadas: 200, saldoLotes, cfg },
      hoy
    );
    // Tope = 50% de 1000 = 500 ⇒ máximo 50 huellitas
    expect(r.descuento).toBe(500);
    expect(r.huellitasCanjeadas).toBe(50);
    expect(r.totalCobrado).toBe(500);
  });

  it("rechaza canjes por debajo del mínimo", () => {
    expect(() =>
      calcularCanje(
        { totalVenta: 1000, huellitasSolicitadas: 5, saldoLotes, cfg },
        hoy
      )
    ).toThrow(/mínimo/);
  });

  it("rechaza canjes mayores al saldo", () => {
    expect(() =>
      calcularCanje(
        { totalVenta: 1000, huellitasSolicitadas: 9999, saldoLotes, cfg },
        hoy
      )
    ).toThrow(/insuficiente/i);
  });
});

describe("diagnosticarPrograma", () => {
  it("clasifica saludable/ajustado/peligroso", () => {
    expect(
      diagnosticarPrograma({
        montoParaUnaHuellita: 1000,
        valorMonetarioHuellita: 10
      }).salud
    ).toBe("saludable"); // 1%

    expect(
      diagnosticarPrograma({
        montoParaUnaHuellita: 1000,
        valorMonetarioHuellita: 50
      }).salud
    ).toBe("ajustado"); // 5%

    expect(
      diagnosticarPrograma({
        montoParaUnaHuellita: 1000,
        valorMonetarioHuellita: 120
      }).salud
    ).toBe("peligroso"); // 12%
  });
});

describe("cumpleaños", () => {
  it("detecta el mes de cumpleaños", () => {
    expect(
      esMesCumpleanos({ fechaNacimiento: "2020-06-15" }, new Date(2026, 5, 1))
    ).toBe(true);
    expect(
      esMesCumpleanos({ fechaNacimiento: "2020-06-15" }, new Date(2026, 6, 1))
    ).toBe(false);
  });

  it("detecta el cumpleaños del día", () => {
    expect(
      esCumpleanos({ fechaNacimiento: "2020-06-15" }, new Date("2026-06-15T10:00:00"))
    ).toBe(true);
  });

  it("no marca cumpleaños en otro día", () => {
    expect(
      esCumpleanos({ fechaNacimiento: "2020-06-15" }, new Date("2026-06-16T10:00:00"))
    ).toBe(false);
  });

  it("trata 29-feb como 28-feb en años no bisiestos", () => {
    expect(
      esCumpleanos({ fechaNacimiento: "2020-02-29" }, new Date("2027-02-28T10:00:00"))
    ).toBe(true);
  });

  it("calcula edad correctamente", () => {
    expect(
      edadMascotaAnios(
        { fechaNacimiento: "2020-06-15" },
        new Date("2026-06-14T10:00:00")
      )
    ).toBe(5);
    expect(
      edadMascotaAnios(
        { fechaNacimiento: "2020-06-15" },
        new Date("2026-06-15T10:00:00")
      )
    ).toBe(6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NIVELES DE LEALTAD
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularNivel", () => {
  it("Bronce cuando acumulado < umbral Plata", () => {
    expect(calcularNivel(0, NIVELES_DEFAULT).id).toBe("bronce");
    expect(calcularNivel(499, NIVELES_DEFAULT).id).toBe("bronce");
  });

  it("Plata desde 500 hasta < 2000", () => {
    expect(calcularNivel(500, NIVELES_DEFAULT).id).toBe("plata");
    expect(calcularNivel(1999, NIVELES_DEFAULT).id).toBe("plata");
  });

  it("Oro desde 2000 hasta < 5000", () => {
    expect(calcularNivel(2000, NIVELES_DEFAULT).id).toBe("oro");
    expect(calcularNivel(4999, NIVELES_DEFAULT).id).toBe("oro");
  });

  it("Elite desde 5000 en adelante", () => {
    expect(calcularNivel(5000, NIVELES_DEFAULT).id).toBe("elite");
    expect(calcularNivel(99999, NIVELES_DEFAULT).id).toBe("elite");
  });

  it("multiplicadores correctos", () => {
    expect(calcularNivel(0, NIVELES_DEFAULT).multiplicador).toBe(1.0);
    expect(calcularNivel(500, NIVELES_DEFAULT).multiplicador).toBeCloseTo(1.1);
    expect(calcularNivel(5000, NIVELES_DEFAULT).multiplicador).toBe(1.5);
  });

  it("descuento fijo en Oro y Elite", () => {
    expect(calcularNivel(0, NIVELES_DEFAULT).descuentoFijoPct).toBe(0);
    expect(calcularNivel(500, NIVELES_DEFAULT).descuentoFijoPct).toBe(0);
    expect(calcularNivel(2000, NIVELES_DEFAULT).descuentoFijoPct).toBe(0.02);
    expect(calcularNivel(5000, NIVELES_DEFAULT).descuentoFijoPct).toBe(0.05);
  });

  it("acepta niveles desordenados (defensivo)", () => {
    const desorden = [...NIVELES_DEFAULT].reverse();
    expect(calcularNivel(700, desorden).id).toBe("plata");
  });

  it("falla con array vacío", () => {
    expect(() => calcularNivel(100, [])).toThrow();
  });
});

describe("progresoNivel", () => {
  it("cliente nuevo: tramo 0%, faltan 500 para Plata", () => {
    const p = progresoNivel(0, NIVELES_DEFAULT);
    expect(p.nivelActual.id).toBe("bronce");
    expect(p.nivelSiguiente?.id).toBe("plata");
    expect(p.huellitasFaltantes).toBe(500);
    expect(p.pctTramo).toBe(0);
  });

  it("a mitad de Plata (1250 = mitad entre 500 y 2000)", () => {
    const p = progresoNivel(1250, NIVELES_DEFAULT);
    expect(p.nivelActual.id).toBe("plata");
    expect(p.nivelSiguiente?.id).toBe("oro");
    expect(p.huellitasFaltantes).toBe(750);
    expect(p.pctTramo).toBeCloseTo(0.5);
  });

  it("Elite: tramo y global = 1, faltan 0", () => {
    const p = progresoNivel(6000, NIVELES_DEFAULT);
    expect(p.nivelActual.id).toBe("elite");
    expect(p.nivelSiguiente).toBeNull();
    expect(p.huellitasFaltantes).toBe(0);
    expect(p.pctTramo).toBe(1);
    expect(p.pctGlobal).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE PREMIOS
// ─────────────────────────────────────────────────────────────────────────────

describe("aumentarCatalogo", () => {
  const premios: Premio[] = [
    {
      localId: "demo",
      nombre: "Pelota interactiva",
      descripcion: "",
      costoHuellitas: 80,
      nivelMinimoId: "bronce",
      categoria: "juguete",
      stock: null,
      activo: true
    },
    {
      localId: "demo",
      nombre: "Bolsa de premios gourmet",
      descripcion: "",
      costoHuellitas: 200,
      nivelMinimoId: "plata",
      categoria: "alimento",
      stock: 5,
      activo: true
    },
    {
      localId: "demo",
      nombre: "Experiencia premium",
      descripcion: "",
      costoHuellitas: 500,
      nivelMinimoId: "elite",
      categoria: "servicio",
      stock: null,
      activo: true
    },
    {
      localId: "demo",
      nombre: "Ya canjeado",
      descripcion: "",
      costoHuellitas: 50,
      nivelMinimoId: "bronce",
      categoria: "otro",
      stock: 0,
      activo: true
    }
  ];

  it("Bronce con saldo 100: ve los 4, pero algunos bloqueados", () => {
    const cat = aumentarCatalogo(premios, {
      saldoCliente: 100,
      nivelCliente: NIVELES_DEFAULT[0],
      niveles: NIVELES_DEFAULT
    });
    const byNombre = (n: string) => cat.find((c) => c.premio.nombre === n)!;

    expect(byNombre("Pelota interactiva").desbloqueado).toBe(true);
    expect(byNombre("Bolsa de premios gourmet").motivo).toBe("nivel");
    expect(byNombre("Experiencia premium").motivo).toBe("nivel");
    expect(byNombre("Ya canjeado").motivo).toBe("stock");
  });

  it("Plata con saldo suficiente desbloquea su premio", () => {
    const cat = aumentarCatalogo(premios, {
      saldoCliente: 250,
      nivelCliente: NIVELES_DEFAULT[1],
      niveles: NIVELES_DEFAULT
    });
    expect(cat.find((c) => c.premio.nombre === "Bolsa de premios gourmet")!.desbloqueado).toBe(true);
    expect(cat.find((c) => c.premio.nombre === "Experiencia premium")!.motivo).toBe("nivel");
  });

  it("Elite con saldo bajo: bloqueado por saldo si no alcanza", () => {
    const cat = aumentarCatalogo(premios, {
      saldoCliente: 100,
      nivelCliente: NIVELES_DEFAULT[3],
      niveles: NIVELES_DEFAULT
    });
    expect(cat.find((c) => c.premio.nombre === "Experiencia premium")!.motivo).toBe("saldo");
    expect(cat.find((c) => c.premio.nombre === "Experiencia premium")!.faltanHuellitas).toBe(400);
  });
});
