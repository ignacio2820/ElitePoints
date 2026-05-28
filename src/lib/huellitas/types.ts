import { z } from "zod";

/**
 * Esquema Firestore — ElitePoints (multi-comercio B2B)
 *
 * Jerarquía (Enfoque A — rutas legacy en Firestore):
 *   /Locales/{localId}                          → comercio
 *   /Locales/{localId}/ConfiguracionLocal/main  → reglas del programa
 *   /Locales/{localId}/Clientes/{clienteId}     → cliente
 *   /Locales/{localId}/Clientes/{clienteId}/Huellitas/{loteId} → lotes de puntos
 *   /Locales/{localId}/Ventas/{ventaId}         → acumulación
 *   /Locales/{localId}/Canjes/{canjeId}         → canje en caja
 *   /Locales/{localId}/Premios/{premioId}       → catálogo
 *
 * En código usamos el concepto **Puntos** y **Transacción**; en Firestore muchos
 * campos siguen el prefijo `huellitas*` / `saldoHuellitas` por compatibilidad.
 */

// ──────────────────────────────────────────────────────────────────────────────
// COMERCIO (vista de /Locales/{localId})
// ──────────────────────────────────────────────────────────────────────────────

export const ComercioSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1).max(120),
  rubro: z.string().max(80).optional(),
  logo: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  /** Total de puntos emitidos (métrica denormalizada opcional). */
  puntosOtorgados: z.number().int().nonnegative().optional()
});

export type Comercio = z.infer<typeof ComercioSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// NIVELES DE LEALTAD
// ──────────────────────────────────────────────────────────────────────────────

export const TemaNivelSchema = z.enum(["bronce", "plata", "oro", "elite"]);
export type TemaNivel = z.infer<typeof TemaNivelSchema>;

export const NivelLealtadSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1).max(40),
  umbralHistorico: z.number().int().nonnegative(),
  multiplicador: z.number().positive().max(10).default(1),
  descuentoFijoPct: z.number().min(0).max(1).default(0),
  tema: TemaNivelSchema.default("bronce"),
  beneficios: z.array(z.string().max(120)).default([])
});

export type NivelLealtad = z.infer<typeof NivelLealtadSchema>;

export const NIVELES_DEFAULT: NivelLealtad[] = [
  {
    id: "bronce",
    nombre: "Bronce",
    umbralHistorico: 0,
    multiplicador: 1.0,
    descuentoFijoPct: 0,
    tema: "bronce",
    beneficios: ["Acumulás puntos con cada compra", "Acceso al catálogo de premios"]
  },
  {
    id: "plata",
    nombre: "Plata",
    umbralHistorico: 500,
    multiplicador: 1.1,
    descuentoFijoPct: 0,
    tema: "plata",
    beneficios: ["Sumás 1.1× puntos en cada compra", "Premios exclusivos del nivel"]
  },
  {
    id: "oro",
    nombre: "Oro",
    umbralHistorico: 2000,
    multiplicador: 1.25,
    descuentoFijoPct: 0.02,
    tema: "oro",
    beneficios: ["Sumás 1.25× puntos", "2% de descuento fijo en compras"]
  },
  {
    id: "elite",
    nombre: "Elite",
    umbralHistorico: 5000,
    multiplicador: 1.5,
    descuentoFijoPct: 0.05,
    tema: "elite",
    beneficios: [
      "Sumás 1.5× puntos en cada compra",
      "5% de descuento fijo",
      "Premios premium del nivel Elite"
    ]
  }
];

/** IDs de nivel legacy (MascotPoints) → nivel ElitePoints. */
export const MAPEO_NIVEL_LEGACY: Record<string, string> = {
  cachorro: "bronce",
  explorador: "plata",
  "gran-guardian": "elite",
  guardian: "elite"
};

export function normalizarNivelId(nivelId: string | undefined): string {
  if (!nivelId) return "bronce";
  return MAPEO_NIVEL_LEGACY[nivelId] ?? nivelId;
}

/** Resuelve tema visual (incluye legacy cachorro/explorador/guardian). */
export function resolverTemaNivel(
  nivel: Pick<NivelLealtad, "tema" | "id">
): TemaNivel {
  const t = nivel.tema;
  if (t === "bronce" || t === "plata" || t === "oro" || t === "elite") return t;
  const legacyTema: Record<string, TemaNivel> = {
    cachorro: "bronce",
    explorador: "plata",
    guardian: "elite"
  };
  return legacyTema[String(t)] ?? legacyTema[normalizarNivelId(nivel.id)] ?? "bronce";
}

// ──────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DEL COMERCIO
// ──────────────────────────────────────────────────────────────────────────────

export const ConfiguracionLocalSchema = z.object({
  localId: z.string().min(1),

  montoParaUnaHuellita: z
    .number()
    .int("Debe ser un entero")
    .positive("Debe ser mayor a 0")
    .max(1_000_000),

  valorMonetarioHuellita: z
    .number()
    .nonnegative("No puede ser negativo")
    .max(1_000_000),

  diasVencimiento: z.number().int().positive().max(3650).default(365),
  minimoHuellitasCanje: z.number().int().nonnegative().default(0),
  topeDescuentoPorcentual: z.number().min(0).max(1).default(1),
  emailsCumpleanosActivos: z.boolean().default(true),
  emailsEncuestaActivos: z.boolean().default(true),

  bonoCumpleanos: z.union([z.literal(2), z.literal(3)]).default(2),

  niveles: z.array(NivelLealtadSchema).min(1).default(NIVELES_DEFAULT),

  bonificaciones: z
    .object({
      cumpleanos: z
        .object({
          activo: z.boolean().default(true),
          multiplicador: z.number().min(1).max(10).default(2)
        })
        .default({ activo: true, multiplicador: 2 }),
      primeraCompra: z
        .object({
          activo: z.boolean().default(true),
          huellitasExtra: z.number().int().nonnegative().max(10000).default(100)
        })
        .default({ activo: true, huellitasExtra: 100 })
    })
    .default({
      cumpleanos: { activo: true, multiplicador: 2 },
      primeraCompra: { activo: true, huellitasExtra: 100 }
    }),

  referidos: z
    .object({
      activo: z.boolean().default(true),
      bonusBienvenida: z.number().int().nonnegative().default(20),
      bonusReferente: z.number().int().nonnegative().default(30),
      diasVencimientoBonus: z.number().int().positive().max(3650).default(365),
      mensajeWhatsApp: z
        .string()
        .max(500)
        .default(
          "¡Hola! Te recomiendo {local}. Registrate con mi código y ganá tus primeros Puntos gratis: {url}"
        )
    })
    .default({
      activo: true,
      bonusBienvenida: 20,
      bonusReferente: 30,
      diasVencimientoBonus: 365,
      mensajeWhatsApp:
        "¡Hola! Te recomiendo {local}. Registrate con mi código y ganá tus primeros Puntos gratis: {url}"
    }),

  actualizadoEn: z.date().or(z.string()).optional(),
  actualizadoPor: z.string().optional()
});

export type ConfiguracionLocal = z.infer<typeof ConfiguracionLocalSchema>;

/** Alias conceptual: monto de ticket por 1 punto emitido. */
export type MontoParaUnPunto = ConfiguracionLocal["montoParaUnaHuellita"];

export function montoParaUnPunto(cfg: Pick<ConfiguracionLocal, "montoParaUnaHuellita">): number {
  return cfg.montoParaUnaHuellita;
}

export function valorMonetarioPunto(
  cfg: Pick<ConfiguracionLocal, "valorMonetarioHuellita">
): number {
  return cfg.valorMonetarioHuellita;
}

export type BonoCumpleanos = 2 | 3;

export function resolverBonoCumpleanos(
  cfg: Pick<ConfiguracionLocal, "bonoCumpleanos" | "bonificaciones">
): BonoCumpleanos {
  if (cfg.bonoCumpleanos === 2 || cfg.bonoCumpleanos === 3) return cfg.bonoCumpleanos;
  const m = cfg.bonificaciones?.cumpleanos?.multiplicador;
  return m === 3 ? 3 : 2;
}

export function accionBonoCumpleanos(bono: BonoCumpleanos): "DUPLICAR" | "TRIPLICAR" {
  return bono === 3 ? "TRIPLICAR" : "DUPLICAR";
}

export function textoBonoCumpleanos(bono: BonoCumpleanos): string {
  return bono === 3 ? "triplicar" : "duplicar";
}

export const CONFIGURACION_DEFAULT: ConfiguracionLocal = {
  localId: "",
  montoParaUnaHuellita: 1000,
  valorMonetarioHuellita: 10,
  diasVencimiento: 365,
  minimoHuellitasCanje: 10,
  topeDescuentoPorcentual: 0.5,
  emailsCumpleanosActivos: true,
  emailsEncuestaActivos: true,
  bonoCumpleanos: 2,
  niveles: NIVELES_DEFAULT,
  bonificaciones: {
    cumpleanos: { activo: true, multiplicador: 2 },
    primeraCompra: { activo: true, huellitasExtra: 100 }
  },
  referidos: {
    activo: true,
    bonusBienvenida: 20,
    bonusReferente: 30,
    diasVencimientoBonus: 365,
    mensajeWhatsApp:
      "¡Hola! Te recomiendo {local}. Registrate con mi código y ganá tus primeros Puntos gratis: {url}"
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// CLIENTE
// ──────────────────────────────────────────────────────────────────────────────

export const ClienteSchema = z.object({
  id: z.string().optional(),
  localId: z.string(),
  nombre: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().max(30).optional().default(""),
  dni: z.string().max(15).optional(),
  claveBarras: z.string().max(15).optional(),
  sufijoIdBarras: z.string().length(8).optional(),
  /** Cumpleaños del cliente (YYYY-MM-DD) para bono de cumpleaños en compras. */
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
    .optional(),

  huellitasActuales: z.number().int().nonnegative().optional(),
  saldoHuellitas: z.number().int().nonnegative().default(0),
  huellitasReservadas: z.number().int().nonnegative().default(0),
  huellitasHistoricas: z.number().int().nonnegative().optional(),
  acumuladoHistorico: z.number().int().nonnegative().default(0),

  nivelId: z.string().default("bronce"),
  codigoCliente: z.string().max(10).optional(),

  codigoReferido: z.string().min(4).max(20).optional(),
  referidoPor: z.string().optional(),
  referidoActivado: z.boolean().default(false),
  referidosActivados: z.number().int().nonnegative().default(0),
  referidosTotales: z.number().int().nonnegative().default(0),
  primerCompraRegistrada: z.boolean().default(false),

  creadoEn: z.union([z.date(), z.string()]).optional()
});

export type Cliente = z.infer<typeof ClienteSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// LOTE DE PUNTOS (Firestore: Huellitas)
// ──────────────────────────────────────────────────────────────────────────────

export interface LoteHuellitas {
  id: string;
  clienteId: string;
  ventaId: string;
  huellitasIniciales: number;
  huellitasRestantes: number;
  fechaEmision: string;
  fechaVencimiento: string;
}

/** Alias conceptual del lote FIFO de puntos. */
export type LotePuntos = LoteHuellitas;

// ──────────────────────────────────────────────────────────────────────────────
// TRANSACCIÓN (vista unificada)
// ──────────────────────────────────────────────────────────────────────────────

export const TipoTransaccionSchema = z.enum(["acumula", "canjea"]);
export type TipoTransaccion = z.infer<typeof TipoTransaccionSchema>;

export const TransaccionSchema = z.object({
  id: z.string().optional(),
  comercioId: z.string().min(1),
  clienteId: z.string().min(1),
  puntos: z.number().int().nonnegative(),
  tipo: TipoTransaccionSchema,
  fecha: z.union([z.date(), z.string()]),
  ventaId: z.string().optional(),
  canjeId: z.string().optional(),
  notas: z.string().max(200).optional()
});

export type Transaccion = z.infer<typeof TransaccionSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// VENTA (acumulación)
// ──────────────────────────────────────────────────────────────────────────────

export const VentaSchema = z.object({
  id: z.string().optional(),
  localId: z.string(),
  clienteId: z.string(),
  totalVenta: z.number().nonnegative(),
  huellitasBase: z.number().int().nonnegative().default(0),
  multiplicadorAplicado: z.number().positive().default(1),
  huellitasGeneradas: z.number().int().nonnegative(),
  huellitasCanjeadas: z.number().int().nonnegative().default(0),
  descuentoAplicado: z.number().nonnegative().default(0),
  descuentoNivel: z.number().nonnegative().default(0),
  totalCobrado: z.number().nonnegative(),
  nivelEnVenta: z.string().optional(),
  fecha: z.union([z.date(), z.string()]).optional()
});

export type Venta = z.infer<typeof VentaSchema>;

export function ventaATransaccion(venta: Venta): Transaccion {
  return {
    id: venta.id,
    comercioId: venta.localId,
    clienteId: venta.clienteId,
    puntos: venta.huellitasGeneradas,
    tipo: "acumula",
    fecha: venta.fecha ?? new Date().toISOString(),
    ventaId: venta.id
  };
}

export function canjeATransaccion(args: {
  id?: string;
  localId: string;
  clienteId: string;
  huellitasCanjeadas: number;
  fecha?: Date | string;
  canjeId?: string;
  ventaId?: string;
}): Transaccion {
  return {
    id: args.id ?? args.canjeId,
    comercioId: args.localId,
    clienteId: args.clienteId,
    puntos: args.huellitasCanjeadas,
    tipo: "canjea",
    fecha: args.fecha ?? new Date().toISOString(),
    canjeId: args.canjeId ?? args.id,
    ventaId: args.ventaId
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// PREMIO
// ──────────────────────────────────────────────────────────────────────────────

export const PremioSchema = z.object({
  id: z.string().optional(),
  localId: z.string(),
  nombre: z.string().min(1).max(80),
  descripcion: z.string().max(280).default(""),
  costoHuellitas: z.number().int().positive(),
  valorDescuento: z.number().nonnegative().optional(),
  nivelMinimoId: z.string().default("bronce"),
  categoria: z.enum(["alimento", "juguete", "accesorio", "servicio", "otro"]).default("otro"),
  stock: z.number().int().nonnegative().nullable().default(null),
  imagen: z.string().url().nullish(),
  activo: z.boolean().default(true)
});

export type Premio = z.infer<typeof PremioSchema>;

/** Costo del premio en puntos (mismo campo Firestore `costoHuellitas`). */
export function costoPremioEnPuntos(premio: Pick<Premio, "costoHuellitas">): number {
  return premio.costoHuellitas;
}

// ──────────────────────────────────────────────────────────────────────────────
// CANJE PENDIENTE
// ──────────────────────────────────────────────────────────────────────────────

export const EstadoCanjeSchema = z.enum([
  "pendiente",
  "completado",
  "cancelado",
  "expirado"
]);
export type EstadoCanje = z.infer<typeof EstadoCanjeSchema>;

export const CanjePendienteSchema = z.object({
  id: z.string().optional(),
  localId: z.string(),
  clienteId: z.string(),
  clienteNombre: z.string(),
  premioId: z.string(),
  premioNombre: z.string(),
  costoHuellitas: z.number().int().positive(),
  valorDescuento: z.number().nonnegative().optional(),
  codigo: z.string().min(4).max(20),
  estado: EstadoCanjeSchema.default("pendiente"),
  creadoEn: z.union([z.date(), z.string()]).optional(),
  expiraEn: z.string(),
  confirmadoEn: z.union([z.date(), z.string()]).optional(),
  confirmadoPor: z.string().optional(),
  ventaId: z.string().optional(),
  plan: z
    .array(
      z.object({
        loteId: z.string(),
        consumidas: z.number().int().positive()
      })
    )
    .optional()
});
export type CanjePendiente = z.infer<typeof CanjePendienteSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// REFERIDOS
// ──────────────────────────────────────────────────────────────────────────────

export const ReferidoIndexSchema = z.object({
  codigo: z.string().min(4).max(20),
  clienteId: z.string().min(1),
  creadoEn: z.union([z.date(), z.string()]).optional()
});
export type ReferidoIndex = z.infer<typeof ReferidoIndexSchema>;

export const EventoReferidoSchema = z.object({
  id: z.string().optional(),
  localId: z.string(),
  codigo: z.string(),
  referenteId: z.string(),
  invitadoId: z.string(),
  ventaId: z.string(),
  bonusBienvenida: z.number().int().nonnegative(),
  bonusReferente: z.number().int().nonnegative(),
  emailEnviado: z.boolean().default(false),
  fecha: z.union([z.date(), z.string()]).optional()
});
export type EventoReferido = z.infer<typeof EventoReferidoSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

export function costoEfectivoPorcentual(
  cfg: Pick<ConfiguracionLocal, "montoParaUnaHuellita" | "valorMonetarioHuellita">
): number {
  if (cfg.montoParaUnaHuellita <= 0) return 0;
  return cfg.valorMonetarioHuellita / cfg.montoParaUnaHuellita;
}

/** Alias de `costoEfectivoPorcentual` con nomenclatura de puntos. */
export const costoEfectivoPorcentualPuntos = costoEfectivoPorcentual;
