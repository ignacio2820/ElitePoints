import type {
  ConfiguracionLocal,
  LoteHuellitas,
  Mascota,
  NivelLealtad,
  Premio
} from "./types";

/**
 * Motor de reglas "Huellitas" — funciones PURAS, sin dependencias de Firestore.
 * Cualquier persistencia (Firestore, memoria, SQL) las usa por igual.
 */

// ──────────────────────────────────────────────────────────────────────────────
// 1. Cálculo de emisión de huellitas
// ──────────────────────────────────────────────────────────────────────────────

export interface ResultadoEmision {
  /** Huellitas tras aplicar multiplicador del nivel. Es lo que se persiste. */
  huellitasGeneradas: number;
  /** Huellitas base (sin multiplicador). Útil para auditoría y vista previa. */
  huellitasBase: number;
  /** Resto en pesos que NO generó huellita (no acumulable hacia próxima venta). */
  resto: number;
  fechaVencimiento: string; // ISO yyyy-mm-dd
}

/**
 * Fórmula central pedida:
 *   huellitasBase = Math.floor(totalVenta / montoParaUnaHuellita)
 *   huellitasGeneradas = round(huellitasBase * multiplicadorDelNivel)
 *
 * Si no se pasa `multiplicador` la emisión es base (Cachorro = 1.0).
 *
 * Validaciones defensivas:
 *  - totalVenta >= 0
 *  - montoParaUnaHuellita > 0
 *  - multiplicador > 0
 */
export function calcularEmision(
  totalVenta: number,
  cfg: Pick<ConfiguracionLocal, "montoParaUnaHuellita" | "diasVencimiento">,
  hoy: Date = new Date(),
  multiplicador = 1
): ResultadoEmision {
  if (!Number.isFinite(totalVenta) || totalVenta < 0) {
    throw new Error("totalVenta inválido");
  }
  if (
    !Number.isFinite(cfg.montoParaUnaHuellita) ||
    cfg.montoParaUnaHuellita <= 0
  ) {
    throw new Error("montoParaUnaHuellita inválido");
  }
  if (!Number.isFinite(multiplicador) || multiplicador <= 0) {
    throw new Error("multiplicador inválido");
  }

  const huellitasBase = Math.floor(totalVenta / cfg.montoParaUnaHuellita);
  const huellitasGeneradas = Math.round(huellitasBase * multiplicador);
  const resto = totalVenta - huellitasBase * cfg.montoParaUnaHuellita;

  const venc = new Date(hoy);
  venc.setUTCHours(0, 0, 0, 0);
  venc.setUTCDate(venc.getUTCDate() + cfg.diasVencimiento);

  return {
    huellitasGeneradas,
    huellitasBase,
    resto,
    fechaVencimiento: venc.toISOString().slice(0, 10)
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// 1.b Bonificaciones especiales (cumpleaños + primera compra)
// ──────────────────────────────────────────────────────────────────────────────

export interface ResultadoBonificaciones {
  /** Multiplicador adicional (sobre el del nivel) por cumpleaños. 1 si no aplica. */
  multiplicadorCumple: number;
  /** True si HOY al menos una mascota del cliente cumple años. */
  esCumpleanos: boolean;
  /** Mascota cuyo cumpleaños gatilló el bonus (la primera detectada). */
  mascotaCumpleId?: string;
  /** Huellitas extra fijas por ser la primera compra del cliente. */
  huellitasExtraPrimeraCompra: number;
  /** True si efectivamente es la primera compra del cliente. */
  esPrimeraCompra: boolean;
}

/**
 * Calcula los bonus aplicables a una venta sin tocar Firestore.
 *
 * Reglas:
 *  - Si `bonificaciones.cumpleanos.activo` y alguna mascota cumple HOY,
 *    se devuelve `multiplicadorCumple` (default 2). Si no aplica, queda en 1.
 *  - Si `bonificaciones.primeraCompra.activo` y `esPrimeraCompra=true`,
 *    se devuelve `huellitasExtraPrimeraCompra` (default 100).
 *
 * Esta función NO suma ni multiplica nada por sí sola: devuelve los factores
 * para que `service.registrarVenta` los aplique en la transacción.
 */
export function calcularBonificaciones(
  args: {
    bonificaciones: Pick<ConfiguracionLocal, "bonificaciones">["bonificaciones"];
    mascotas: Array<Pick<Mascota, "id" | "fechaNacimiento">>;
    esPrimeraCompra: boolean;
  },
  hoy: Date = new Date()
): ResultadoBonificaciones {
  const { bonificaciones, mascotas, esPrimeraCompra } = args;

  let multiplicadorCumple = 1;
  let mascotaCumpleId: string | undefined;
  let cumple = false;

  if (bonificaciones?.cumpleanos?.activo && Array.isArray(mascotas)) {
    const ganadora = mascotas.find(
      (m) => !!m?.fechaNacimiento && esCumpleanos(m, hoy)
    );
    if (ganadora) {
      cumple = true;
      multiplicadorCumple = bonificaciones.cumpleanos.multiplicador ?? 2;
      mascotaCumpleId = ganadora.id;
    }
  }

  const huellitasExtraPrimeraCompra =
    bonificaciones?.primeraCompra?.activo && esPrimeraCompra
      ? bonificaciones.primeraCompra.huellitasExtra ?? 0
      : 0;

  return {
    multiplicadorCumple,
    esCumpleanos: cumple,
    mascotaCumpleId,
    huellitasExtraPrimeraCompra,
    esPrimeraCompra
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. Saldo y vencimiento (FIFO)
// ──────────────────────────────────────────────────────────────────────────────

export function esLoteVigente(
  lote: Pick<LoteHuellitas, "huellitasRestantes" | "fechaVencimiento">,
  hoy: Date = new Date()
): boolean {
  if (lote.huellitasRestantes <= 0) return false;
  return new Date(lote.fechaVencimiento + "T23:59:59Z").getTime() >= hoy.getTime();
}

export function saldoVigente(
  lotes: LoteHuellitas[],
  hoy: Date = new Date()
): number {
  return lotes
    .filter((l) => esLoteVigente(l, hoy))
    .reduce((acc, l) => acc + l.huellitasRestantes, 0);
}

export interface ConsumoLote {
  loteId: string;
  consumidas: number;
}

/**
 * Consume `cantidad` huellitas en orden FIFO (primero las que vencen antes).
 * Devuelve el plan de consumo SIN mutar `lotes`.
 */
export function planConsumoFIFO(
  lotes: LoteHuellitas[],
  cantidad: number,
  hoy: Date = new Date()
): ConsumoLote[] {
  if (cantidad <= 0) return [];

  const vigentes = lotes
    .filter((l) => esLoteVigente(l, hoy))
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));

  const plan: ConsumoLote[] = [];
  let restante = cantidad;

  for (const lote of vigentes) {
    if (restante <= 0) break;
    const tomar = Math.min(lote.huellitasRestantes, restante);
    if (tomar > 0) {
      plan.push({ loteId: lote.id, consumidas: tomar });
      restante -= tomar;
    }
  }

  if (restante > 0) {
    throw new Error(
      `Saldo insuficiente: faltan ${restante} huellitas para completar el canje`
    );
  }
  return plan;
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. Canje
// ──────────────────────────────────────────────────────────────────────────────

export interface ResultadoCanje {
  huellitasCanjeadas: number;
  descuento: number;
  totalCobrado: number;
  plan: ConsumoLote[];
}

export interface ParametrosCanje {
  totalVenta: number;
  huellitasSolicitadas: number;
  saldoLotes: LoteHuellitas[];
  cfg: Pick<
    ConfiguracionLocal,
    "valorMonetarioHuellita" | "minimoHuellitasCanje" | "topeDescuentoPorcentual"
  >;
}

export function calcularCanje(
  { totalVenta, huellitasSolicitadas, saldoLotes, cfg }: ParametrosCanje,
  hoy: Date = new Date()
): ResultadoCanje {
  if (totalVenta < 0) throw new Error("totalVenta inválido");
  if (huellitasSolicitadas < 0) throw new Error("huellitasSolicitadas inválido");

  if (huellitasSolicitadas === 0) {
    return {
      huellitasCanjeadas: 0,
      descuento: 0,
      totalCobrado: totalVenta,
      plan: []
    };
  }

  if (huellitasSolicitadas < cfg.minimoHuellitasCanje) {
    throw new Error(
      `El mínimo para canjear es ${cfg.minimoHuellitasCanje} huellitas`
    );
  }

  const saldo = saldoVigente(saldoLotes, hoy);
  if (huellitasSolicitadas > saldo) {
    throw new Error("Saldo insuficiente");
  }

  const descuentoBruto = huellitasSolicitadas * cfg.valorMonetarioHuellita;
  const tope = totalVenta * cfg.topeDescuentoPorcentual;
  const descuento = Math.min(descuentoBruto, tope, totalVenta);

  // Si el tope recortó el descuento, recortamos también las huellitas consumidas
  // (no se gastan más huellitas de las que efectivamente descuentan).
  const huellitasEfectivas =
    descuento < descuentoBruto && cfg.valorMonetarioHuellita > 0
      ? Math.floor(descuento / cfg.valorMonetarioHuellita)
      : huellitasSolicitadas;

  const plan = planConsumoFIFO(saldoLotes, huellitasEfectivas, hoy);

  return {
    huellitasCanjeadas: huellitasEfectivas,
    descuento: huellitasEfectivas * cfg.valorMonetarioHuellita,
    totalCobrado: Math.max(0, totalVenta - huellitasEfectivas * cfg.valorMonetarioHuellita),
    plan
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. Salud del programa (advertencia visual del panel)
// ──────────────────────────────────────────────────────────────────────────────

export type SaludPrograma = "saludable" | "ajustado" | "peligroso";

export interface DiagnosticoPrograma {
  costoEfectivoPct: number; // 0..1
  salud: SaludPrograma;
  mensaje: string;
}

/**
 * Heurística simple para que el dueño entienda el riesgo del esquema:
 *  - <= 3% costo efectivo → saludable
 *  - 3% – 8%             → ajustado (revisar margen)
 *  - > 8%                → peligroso (probable pérdida de margen)
 */
export function diagnosticarPrograma(
  cfg: Pick<ConfiguracionLocal, "montoParaUnaHuellita" | "valorMonetarioHuellita">
): DiagnosticoPrograma {
  const pct =
    cfg.montoParaUnaHuellita > 0
      ? cfg.valorMonetarioHuellita / cfg.montoParaUnaHuellita
      : 0;

  let salud: SaludPrograma = "saludable";
  let mensaje =
    "Tu programa es sostenible: el descuento que entregás es bajo en relación al ticket.";

  if (pct >= 0.08) {
    salud = "peligroso";
    mensaje =
      "Estás devolviendo más del 8% del ticket en huellitas. Revisá tu margen antes de continuar.";
  } else if (pct >= 0.03) {
    salud = "ajustado";
    mensaje =
      "Estás devolviendo entre el 3% y el 8% del ticket. Funciona si tu margen es alto.";
  }

  return { costoEfectivoPct: pct, salud, mensaje };
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. Cumpleaños de mascota
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve true si HOY es cumpleaños de la mascota en zona horaria local.
 * Compara mes y día (ignora año), tolerante con 29-feb (cae el 28-feb en años no bisiestos).
 */
export function esCumpleanos(
  m: Pick<Mascota, "fechaNacimiento">,
  hoy: Date = new Date()
): boolean {
  const [, mes, dia] = m.fechaNacimiento.split("-").map(Number);
  if (!mes || !dia) return false;

  const hoyMes = hoy.getMonth() + 1;
  const hoyDia = hoy.getDate();

  if (mes === hoyMes && dia === hoyDia) return true;

  // 29-feb en año no bisiesto → festejar el 28-feb
  if (mes === 2 && dia === 29) {
    const esBisiesto =
      (hoy.getFullYear() % 4 === 0 && hoy.getFullYear() % 100 !== 0) ||
      hoy.getFullYear() % 400 === 0;
    if (!esBisiesto && hoyMes === 2 && hoyDia === 28) return true;
  }
  return false;
}

export function edadMascotaAnios(
  m: Pick<Mascota, "fechaNacimiento">,
  hoy: Date = new Date()
): number {
  const nac = new Date(m.fechaNacimiento + "T00:00:00");
  let anios = hoy.getFullYear() - nac.getFullYear();
  const m1 = hoy.getMonth() - nac.getMonth();
  if (m1 < 0 || (m1 === 0 && hoy.getDate() < nac.getDate())) anios--;
  return Math.max(0, anios);
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. Niveles de lealtad (gamificación)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve los niveles ordenados ASC por umbralHistorico (defensivo).
 * Garantiza que `niveles[0]` siempre sea el de menor umbral (debería ser 0).
 */
export function niveleseOrdenados(niveles: NivelLealtad[]): NivelLealtad[] {
  return [...niveles].sort((a, b) => a.umbralHistorico - b.umbralHistorico);
}

/**
 * Calcula el nivel actual del cliente a partir de su acumulado histórico.
 * Devuelve el de mayor `umbralHistorico` que el cliente haya superado.
 */
export function calcularNivel(
  acumuladoHistorico: number,
  niveles: NivelLealtad[]
): NivelLealtad {
  if (niveles.length === 0) {
    throw new Error("Se requiere al menos un nivel configurado");
  }
  const ord = niveleseOrdenados(niveles);
  let actual = ord[0];
  for (const n of ord) {
    if (acumuladoHistorico >= n.umbralHistorico) actual = n;
    else break;
  }
  return actual;
}

export interface ProgresoNivel {
  nivelActual: NivelLealtad;
  nivelSiguiente: NivelLealtad | null;
  /** Huellitas históricas que faltan para subir. 0 si ya está en el máximo. */
  huellitasFaltantes: number;
  /** Avance en el TRAMO actual (0..1). 1 si está en el máximo nivel. */
  pctTramo: number;
  /** Avance global desde 0 hasta el último nivel (0..1). Útil para barra global. */
  pctGlobal: number;
}

/**
 * Información para la barra de progreso del cliente:
 *  - nivel actual y siguiente
 *  - huellitas faltantes para subir
 *  - porcentaje del tramo y global
 */
export function progresoNivel(
  acumuladoHistorico: number,
  niveles: NivelLealtad[]
): ProgresoNivel {
  const ord = niveleseOrdenados(niveles);
  const actual = calcularNivel(acumuladoHistorico, ord);
  const idx = ord.findIndex((n) => n.id === actual.id);
  const siguiente = ord[idx + 1] ?? null;

  if (!siguiente) {
    return {
      nivelActual: actual,
      nivelSiguiente: null,
      huellitasFaltantes: 0,
      pctTramo: 1,
      pctGlobal: 1
    };
  }

  const tramo = siguiente.umbralHistorico - actual.umbralHistorico;
  const enTramo = Math.max(0, acumuladoHistorico - actual.umbralHistorico);
  const pctTramo = tramo > 0 ? Math.min(1, enTramo / tramo) : 1;

  const techo = ord[ord.length - 1].umbralHistorico;
  const pctGlobal = techo > 0 ? Math.min(1, acumuladoHistorico / techo) : 0;

  return {
    nivelActual: actual,
    nivelSiguiente: siguiente,
    huellitasFaltantes: Math.max(0, siguiente.umbralHistorico - acumuladoHistorico),
    pctTramo,
    pctGlobal
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. Catálogo de premios
// ──────────────────────────────────────────────────────────────────────────────

export interface PremioAumentado {
  premio: Premio;
  /** True si el cliente puede canjearlo HOY (saldo + nivel + stock + activo). */
  desbloqueado: boolean;
  /** Razón por la que está bloqueado (si lo está). */
  motivo: "ok" | "nivel" | "saldo" | "stock" | "inactivo";
  /** Nivel mínimo requerido (resuelto desde nivelMinimoId). */
  nivelMinimo?: NivelLealtad;
  /** Huellitas que faltan al cliente para canjearlo (saldo). 0 si ya alcanza. */
  faltanHuellitas: number;
}

/**
 * Aumenta el catálogo con la información de visibilidad/desbloqueo para un cliente.
 * El front renderiza los bloqueados con candado y motivo.
 *
 * Reglas:
 *  - inactivo o stock 0 → no canjeable.
 *  - nivelCliente < nivelMinimo → bloqueado por nivel (visible con candado).
 *  - saldo < costo → bloqueado por saldo.
 *  - especiesObjetivo no vacía y no incluye especies del cliente → se oculta
 *    SOLO si el cliente tiene mascotas (sino se muestra igual para no
 *    castigar a usuarios sin ficha completa).
 */
export function aumentarCatalogo(
  premios: Premio[],
  ctx: {
    saldoCliente: number;
    nivelCliente: NivelLealtad;
    niveles: NivelLealtad[];
    especiesCliente?: string[];
  }
): PremioAumentado[] {
  const ord = niveleseOrdenados(ctx.niveles);
  const idxCliente = ord.findIndex((n) => n.id === ctx.nivelCliente.id);

  return premios
    .filter((p) => {
      if (!p.especiesObjetivo || p.especiesObjetivo.length === 0) return true;
      if (!ctx.especiesCliente || ctx.especiesCliente.length === 0) return true;
      return p.especiesObjetivo.some((e) => ctx.especiesCliente!.includes(e));
    })
    .map((premio) => {
      const nivelMinimo = ord.find((n) => n.id === premio.nivelMinimoId);
      const idxMin = nivelMinimo
        ? ord.findIndex((n) => n.id === nivelMinimo.id)
        : 0;

      let motivo: PremioAumentado["motivo"] = "ok";
      if (!premio.activo) motivo = "inactivo";
      else if (premio.stock !== null && (premio.stock ?? 0) <= 0) motivo = "stock";
      else if (idxCliente < idxMin) motivo = "nivel";
      else if (ctx.saldoCliente < premio.costoHuellitas) motivo = "saldo";

      return {
        premio,
        desbloqueado: motivo === "ok",
        motivo,
        nivelMinimo,
        faltanHuellitas: Math.max(0, premio.costoHuellitas - ctx.saldoCliente)
      };
    });
}
