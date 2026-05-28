import type {
  ConfiguracionLocal,
  LoteHuellitas,
  LotePuntos,
  NivelLealtad,
  Premio,
  Venta
} from "./types";
import { ventaATransaccion, type Transaccion } from "./types";

/**
 * Motor de reglas ElitePoints — funciones PURAS, sin Firestore.
 */

// ──────────────────────────────────────────────────────────────────────────────
// 1. Emisión de puntos
// ──────────────────────────────────────────────────────────────────────────────

export interface ResultadoEmision {
  /** Puntos tras multiplicador de nivel (persistidos como `huellitasGeneradas`). */
  huellitasGeneradas: number;
  huellitasBase: number;
  resto: number;
  fechaVencimiento: string;
}

/** Alias conceptual de `ResultadoEmision`. */
export type ResultadoEmisionPuntos = ResultadoEmision;

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

export const calcularEmisionPuntos = calcularEmision;

// ──────────────────────────────────────────────────────────────────────────────
// 1.b Bonificaciones (cumpleaños del cliente + primera compra)
// ──────────────────────────────────────────────────────────────────────────────

export interface ResultadoBonificaciones {
  multiplicadorCumple: number;
  esCumpleanos: boolean;
  huellitasExtraPrimeraCompra: number;
  esPrimeraCompra: boolean;
}

export function calcularBonificaciones(
  args: {
    bonificaciones: Pick<ConfiguracionLocal, "bonificaciones">["bonificaciones"];
    bonoCumpleanos?: 2 | 3;
    fechaNacimientoCliente?: string;
    esPrimeraCompra: boolean;
  },
  hoy: Date = new Date()
): ResultadoBonificaciones {
  const { bonificaciones, bonoCumpleanos, fechaNacimientoCliente, esPrimeraCompra } =
    args;

  let multiplicadorCumple = 1;
  let cumple = false;

  if (
    bonificaciones?.cumpleanos?.activo &&
    fechaNacimientoCliente &&
    esCumpleanosCliente(fechaNacimientoCliente, hoy)
  ) {
    cumple = true;
    const legacy = bonificaciones.cumpleanos.multiplicador;
    multiplicadorCumple =
      bonoCumpleanos ?? (legacy === 3 ? 3 : legacy === 2 ? 2 : 2);
  }

  const huellitasExtraPrimeraCompra =
    bonificaciones?.primeraCompra?.activo && esPrimeraCompra
      ? bonificaciones.primeraCompra.huellitasExtra ?? 0
      : 0;

  return {
    multiplicadorCumple,
    esCumpleanos: cumple,
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
  lotes: LoteHuellitas[] | LotePuntos[],
  hoy: Date = new Date()
): number {
  return lotes
    .filter((l) => esLoteVigente(l, hoy))
    .reduce((acc, l) => acc + l.huellitasRestantes, 0);
}

export const saldoPuntosVigente = saldoVigente;

export interface ConsumoLote {
  loteId: string;
  consumidas: number;
}

export function planConsumoFIFO(
  lotes: LoteHuellitas[] | LotePuntos[],
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
      `Saldo insuficiente: faltan ${restante} puntos para completar el canje`
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

export type ResultadoCanjePuntos = ResultadoCanje;

export interface ParametrosCanje {
  totalVenta: number;
  huellitasSolicitadas: number;
  saldoLotes: LoteHuellitas[] | LotePuntos[];
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
  if (huellitasSolicitadas < 0) throw new Error("puntos solicitados inválidos");

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
      `El mínimo para canjear es ${cfg.minimoHuellitasCanje} puntos`
    );
  }

  const saldo = saldoVigente(saldoLotes, hoy);
  if (huellitasSolicitadas > saldo) {
    throw new Error("Saldo insuficiente");
  }

  const descuentoBruto = huellitasSolicitadas * cfg.valorMonetarioHuellita;
  const tope = totalVenta * cfg.topeDescuentoPorcentual;
  const descuento = Math.min(descuentoBruto, tope, totalVenta);

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
// 4. Salud del programa
// ──────────────────────────────────────────────────────────────────────────────

export type SaludPrograma = "saludable" | "ajustado" | "peligroso";

export interface DiagnosticoPrograma {
  costoEfectivoPct: number;
  salud: SaludPrograma;
  mensaje: string;
}

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
      "Estás devolviendo más del 8% del ticket en puntos. Revisá tu margen antes de continuar.";
  } else if (pct >= 0.03) {
    salud = "ajustado";
    mensaje =
      "Estás devolviendo entre el 3% y el 8% del ticket. Funciona si tu margen es alto.";
  }

  return { costoEfectivoPct: pct, salud, mensaje };
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. Cumpleaños del cliente
// ──────────────────────────────────────────────────────────────────────────────

export function esMesCumpleanosCliente(
  fechaNacimiento: string | undefined,
  hoy: Date = new Date()
): boolean {
  if (!fechaNacimiento) return false;
  const [, mes] = fechaNacimiento.split("-").map(Number);
  if (!mes || mes < 1 || mes > 12) return false;
  return mes === hoy.getMonth() + 1;
}

export function esCumpleanosCliente(
  fechaNacimiento: string | undefined,
  hoy: Date = new Date()
): boolean {
  if (!fechaNacimiento) return false;
  const [, mes, dia] = fechaNacimiento.split("-").map(Number);
  if (!mes || !dia) return false;

  const hoyMes = hoy.getMonth() + 1;
  const hoyDia = hoy.getDate();

  if (mes === hoyMes && dia === hoyDia) return true;

  if (mes === 2 && dia === 29) {
    const esBisiesto =
      (hoy.getFullYear() % 4 === 0 && hoy.getFullYear() % 100 !== 0) ||
      hoy.getFullYear() % 400 === 0;
    if (!esBisiesto && hoyMes === 2 && hoyDia === 28) return true;
  }
  return false;
}

export function edadClienteAnios(
  fechaNacimiento: string | undefined,
  hoy: Date = new Date()
): number {
  if (!fechaNacimiento) return 0;
  const nac = new Date(fechaNacimiento + "T00:00:00");
  let anios = hoy.getFullYear() - nac.getFullYear();
  const m1 = hoy.getMonth() - nac.getMonth();
  if (m1 < 0 || (m1 === 0 && hoy.getDate() < nac.getDate())) anios--;
  return Math.max(0, anios);
}

/** @deprecated Usar `esMesCumpleanosCliente` */
export function esMesCumpleanos(
  entidad: { fechaNacimiento: string },
  hoy?: Date
): boolean {
  return esMesCumpleanosCliente(entidad.fechaNacimiento, hoy);
}

/** @deprecated Usar `esCumpleanosCliente` */
export function esCumpleanos(
  entidad: { fechaNacimiento: string },
  hoy?: Date
): boolean {
  return esCumpleanosCliente(entidad.fechaNacimiento, hoy);
}

/** @deprecated Usar `edadClienteAnios` */
export function edadMascotaAnios(
  entidad: { fechaNacimiento: string },
  hoy?: Date
): number {
  return edadClienteAnios(entidad.fechaNacimiento, hoy);
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. Niveles de lealtad
// ──────────────────────────────────────────────────────────────────────────────

export function niveleseOrdenados(niveles: NivelLealtad[]): NivelLealtad[] {
  return [...niveles].sort((a, b) => a.umbralHistorico - b.umbralHistorico);
}

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
  /** Puntos históricos que faltan para el siguiente nivel. */
  huellitasFaltantes: number;
  pctTramo: number;
  pctGlobal: number;
}

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

/** Alias: puntos faltantes para el siguiente nivel. */
export function puntosFaltantesNivel(progreso: ProgresoNivel): number {
  return progreso.huellitasFaltantes;
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. Catálogo de premios
// ──────────────────────────────────────────────────────────────────────────────

export interface PremioAumentado {
  premio: Premio;
  desbloqueado: boolean;
  motivo: "ok" | "nivel" | "saldo" | "stock" | "inactivo";
  nivelMinimo?: NivelLealtad;
  faltanHuellitas: number;
}

export type FaltanPuntosPremio = PremioAumentado["faltanHuellitas"];

export function aumentarCatalogo(
  premios: Premio[],
  ctx: {
    saldoCliente: number;
    nivelCliente: NivelLealtad;
    niveles: NivelLealtad[];
  }
): PremioAumentado[] {
  const ord = niveleseOrdenados(ctx.niveles);
  const idxCliente = ord.findIndex((n) => n.id === ctx.nivelCliente.id);

  return premios.map((premio) => {
    const nivelMinimo = ord.find((n) => n.id === premio.nivelMinimoId);
    const idxMin = nivelMinimo ? ord.findIndex((n) => n.id === nivelMinimo.id) : 0;

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

// ──────────────────────────────────────────────────────────────────────────────
// 8. Transacciones (vista unificada)
// ──────────────────────────────────────────────────────────────────────────────

export function ventasATransacciones(ventas: Venta[]): Transaccion[] {
  return ventas.map(ventaATransaccion);
}
