import { z } from "zod";

/**
 * Esquema de Firestore — Motor "Huellitas" (multi-tenant Pet Shops)
 *
 * Jerarquía:
 *   /Locales/{localId}                          -> datos del comercio
 *   /Locales/{localId}/ConfiguracionLocal/main  -> reglas del programa de fidelidad
 *   /Locales/{localId}/Clientes/{clienteId}    -> clientes del local
 *   /Locales/{localId}/Clientes/{clienteId}/Mascotas/{mascotaId}
 *   /Locales/{localId}/Clientes/{clienteId}/Huellitas/{huellitaId} -> lotes (con vencimiento)
 *   /Locales/{localId}/Ventas/{ventaId}         -> registro de ventas y emisión
 *   /Locales/{localId}/Canjes/{canjeId}         -> registro de redenciones
 *   /Locales/{localId}/Premios/{premioId}       -> catálogo de premios
 *   /Locales/{localId}/Referidos/{codigo}       -> índice código → clienteId
 *
 * Decisiones clave:
 *  - Huellitas modeladas en LOTES (vencimiento FIFO real).
 *  - "Costo de Acumulación" y "Valor de Canje" separados explícitamente.
 *  - Niveles de lealtad CONFIGURABLES por local (nada hardcodeado en código).
 *  - `acumuladoHistorico` del cliente nunca decrece: define el rango/nivel.
 */

// ──────────────────────────────────────────────────────────────────────────────
// NIVELES DE LEALTAD (gamificación)
// ──────────────────────────────────────────────────────────────────────────────

export const NivelLealtadSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1).max(40),
  /** Acumulado histórico mínimo para alcanzar el nivel. Cachorro = 0. */
  umbralHistorico: z.number().int().nonnegative(),
  /** Multiplicador sobre las huellitas EMITIDAS (Cachorro 1.0, Explorador 1.1, Gran Guardián 1.5). */
  multiplicador: z.number().positive().max(10).default(1),
  /** Descuento fijo % aplicado siempre al ticket (0..1). Gran Guardián = 0.05. */
  descuentoFijoPct: z.number().min(0).max(1).default(0),
  /** Color para badge/UI (clase Tailwind o token semántico). */
  tema: z.enum(["cachorro", "explorador", "guardian"]).default("cachorro"),
  /** Beneficios listados al cliente (texto libre, 1 línea por item). */
  beneficios: z.array(z.string().max(120)).default([])
});

export type NivelLealtad = z.infer<typeof NivelLealtadSchema>;

/** Tres niveles default pedidos. Editables por el dueño. */
export const NIVELES_DEFAULT: NivelLealtad[] = [
  {
    id: "cachorro",
    nombre: "Cachorro",
    umbralHistorico: 0,
    multiplicador: 1.0,
    descuentoFijoPct: 0,
    tema: "cachorro",
    beneficios: ["Acumulás huellitas con cada compra", "Saludo de cumpleaños para tu mascota"]
  },
  {
    id: "explorador",
    nombre: "Explorador",
    umbralHistorico: 500,
    multiplicador: 1.1,
    descuentoFijoPct: 0,
    tema: "explorador",
    beneficios: ["Sumás 1.1× huellitas en cada compra", "Acceso a premios exclusivos"]
  },
  {
    id: "gran-guardian",
    nombre: "Gran Guardián",
    umbralHistorico: 2000,
    multiplicador: 1.5,
    descuentoFijoPct: 0.05,
    tema: "guardian",
    beneficios: [
      "Sumás 1.5× huellitas en cada compra",
      "5% de descuento fijo en todo el local",
      "Premios premium reservados para tu rango"
    ]
  }
];

// ──────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DEL LOCAL
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

  /** Niveles de lealtad. Deben venir ordenados por umbralHistorico ASC. */
  niveles: z.array(NivelLealtadSchema).min(1).default(NIVELES_DEFAULT),

  /**
   * Bonificaciones especiales activables por el dueño desde Configuración.
   *  - cumpleanos: si HOY es cumpleaños de alguna mascota del cliente,
   *    multiplica por `multiplicador` las huellitas emitidas en la venta.
   *  - primeraCompra: si es la primera venta del cliente, suma un lote
   *    fijo de `huellitasExtra` huellitas (vencimiento estándar).
   *
   * Ambas son independientes y pueden combinarse con el multiplicador del
   * nivel del cliente sin pisarlo.
   */
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

  /** Programa "Boca en Boca". */
  referidos: z
    .object({
      activo: z.boolean().default(true),
      /** Huellitas de regalo que recibe el NUEVO cliente al hacer su primera compra. */
      bonusBienvenida: z.number().int().nonnegative().default(20),
      /** Huellitas que recibe el REFERENTE cuando su invitado hace la primera compra. */
      bonusReferente: z.number().int().nonnegative().default(30),
      /** Vencimiento puntual de los bonus de referido (default: igual al global). */
      diasVencimientoBonus: z.number().int().positive().max(3650).default(365),
      /** Mensaje base de WhatsApp con placeholders {local}, {codigo}, {url}. */
      mensajeWhatsApp: z
        .string()
        .max(500)
        .default(
          "¡Hola! Te recomiendo {local}. Registrate con mi código y ganá tus primeras Huellitas gratis: {url}"
        )
    })
    .default({
      activo: true,
      bonusBienvenida: 20,
      bonusReferente: 30,
      diasVencimientoBonus: 365,
      mensajeWhatsApp:
        "¡Hola! Te recomiendo {local}. Registrate con mi código y ganá tus primeras Huellitas gratis: {url}"
    }),

  actualizadoEn: z.date().or(z.string()).optional(),
  actualizadoPor: z.string().optional()
});

export type ConfiguracionLocal = z.infer<typeof ConfiguracionLocalSchema>;

export const CONFIGURACION_DEFAULT: ConfiguracionLocal = {
  localId: "",
  montoParaUnaHuellita: 1000,
  valorMonetarioHuellita: 10,
  diasVencimiento: 365,
  minimoHuellitasCanje: 10,
  topeDescuentoPorcentual: 0.5,
  emailsCumpleanosActivos: true,
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
      "¡Hola! Te recomiendo {local}. Registrate con mi código y ganá tus primeras Huellitas gratis: {url}"
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// MASCOTA (ficha sofisticada)
// ──────────────────────────────────────────────────────────────────────────────

export const EspecieSchema = z.enum([
  "perro",
  "gato",
  "ave",
  "roedor",
  "reptil",
  "otro"
]);
export type Especie = z.infer<typeof EspecieSchema>;

export const SexoSchema = z.enum(["macho", "hembra", "desconocido"]);
export type Sexo = z.infer<typeof SexoSchema>;

export const MascotaSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(1, "El nombre es obligatorio").max(60),
  /** Tipo visible (Perro, Gato, …). Se guarda junto con `especie` para compatibilidad. */
  tipo: z.string().min(1).max(20).optional(),
  especie: EspecieSchema,
  raza: z.string().max(80).optional(),
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),

  // Identidad ampliada
  sexo: SexoSchema.optional(),
  color: z.string().max(40).optional(),
  pesoKg: z.number().positive().max(300).optional(),

  // Salud
  esterilizado: z.boolean().optional(),
  alergias: z.string().max(300).optional(),
  medicacionActual: z.string().max(300).optional(),
  veterinario: z.string().max(120).optional(),

  // Alimentación
  planAlimenticio: z.string().max(200).optional(),
  marcaAlimentoFavorita: z.string().max(80).optional(),

  notas: z.string().max(500).optional(),
  ultimoCumpleanosNotificado: z.string().optional(),
  /** true tras el primer guardado por el cliente: la fecha no se puede editar. */
  fechaNacimientoBloqueada: z.boolean().optional()
});

export type Mascota = z.infer<typeof MascotaSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// CLIENTE (con gamificación)
// ──────────────────────────────────────────────────────────────────────────────

export const ClienteSchema = z.object({
  id: z.string().optional(),
  localId: z.string(),
  nombre: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().max(30).optional().default(""),

  /** Saldo CACHE de huellitas vigentes (suma de lotes no vencidos). */
  saldoHuellitas: z.number().int().nonnegative().default(0),

  /**
   * Huellitas RESERVADAS por tickets pendientes (canjes que el cliente
   * solicitó pero el local todavía no confirmó). Se restan visualmente del
   * saldo para evitar que el cliente intente canjear dos premios que en
   * conjunto exceden lo que realmente tiene.
   *
   * Invariante: huellitasReservadas <= saldoHuellitas en todo momento
   * (la transacción de crearTicketCanje lo asegura).
   */
  huellitasReservadas: z.number().int().nonnegative().default(0),

  /**
   * Acumulado histórico de huellitas EMITIDAS (incluye multiplicador de nivel).
   * Nunca decrece al canjear: es la métrica que define el rango.
   */
  acumuladoHistorico: z.number().int().nonnegative().default(0),

  /** Nivel actual denormalizado para queries rápidas. */
  nivelId: z.string().default("cachorro"),

  /**
   * Código corto humano-amigable (ej "ABC-123") que identifica al cliente
   * en caja. Único por local. Lo dicta el cliente al cajero y reemplaza
   * el ID largo de Firestore.
   */
  codigoCliente: z.string().max(10).optional(),

  // ─── Programa de referidos ──────────────────────────────────────────
  /** Código único que comparte este cliente para invitar amigos. */
  codigoReferido: z.string().min(4).max(20).optional(),
  /** ID del cliente que invitó a éste (si vino por referido). */
  referidoPor: z.string().optional(),
  /**
   * Marca idempotente: una vez que se acreditó la recompensa por referido
   * en la primera compra, queda en true para evitar dobles acreditaciones.
   */
  referidoActivado: z.boolean().default(false),
  /** Cantidad de invitados que YA hicieron su primera compra. */
  referidosActivados: z.number().int().nonnegative().default(0),
  /** Cantidad de invitados acumulados (con o sin compra). */
  referidosTotales: z.number().int().nonnegative().default(0),
  /** Marca de "ya hizo su primera compra" — gatilla la activación. */
  primerCompraRegistrada: z.boolean().default(false),

  mascotas: z.array(MascotaSchema).default([]),
  creadoEn: z.union([z.date(), z.string()]).optional()
});

export type Cliente = z.infer<typeof ClienteSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// LOTE DE HUELLITAS
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

// ──────────────────────────────────────────────────────────────────────────────
// VENTA
// ──────────────────────────────────────────────────────────────────────────────

export const VentaSchema = z.object({
  id: z.string().optional(),
  localId: z.string(),
  clienteId: z.string(),
  totalVenta: z.number().nonnegative(),
  /** Huellitas BASE antes del multiplicador (= floor(total/monto)). */
  huellitasBase: z.number().int().nonnegative().default(0),
  /** Multiplicador aplicado por nivel (1.0 / 1.1 / 1.5). */
  multiplicadorAplicado: z.number().positive().default(1),
  /** Huellitas finales emitidas (BASE * multiplicador, redondeado). */
  huellitasGeneradas: z.number().int().nonnegative(),
  huellitasCanjeadas: z.number().int().nonnegative().default(0),
  descuentoAplicado: z.number().nonnegative().default(0),
  /** Descuento fijo del nivel en pesos. */
  descuentoNivel: z.number().nonnegative().default(0),
  totalCobrado: z.number().nonnegative(),
  /** Nivel del cliente al MOMENTO de la venta (auditoría). */
  nivelEnVenta: z.string().optional(),
  fecha: z.union([z.date(), z.string()]).optional()
});

export type Venta = z.infer<typeof VentaSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// PREMIO (catálogo)
// ──────────────────────────────────────────────────────────────────────────────

export const PremioSchema = z.object({
  id: z.string().optional(),
  localId: z.string(),
  nombre: z.string().min(1).max(80),
  descripcion: z.string().max(280).default(""),
  /** Huellitas requeridas para canjear este premio. */
  costoHuellitas: z.number().int().positive(),
  /**
   * Valor del descuento en pesos al canjear este premio (snapshot informativo).
   * Si no se setea, la UI lo calcula como
   * `costoHuellitas * valorMonetarioHuellita` usando la configuración vigente.
   * Útil cuando el premio es un "5% off", "shampoo de regalo", "2x1", etc.
   * donde el costo en pesos no es la simple multiplicación.
   */
  valorDescuento: z.number().nonnegative().optional(),
  /** ID del nivel mínimo requerido para canjear (referencia a NivelLealtad.id). */
  nivelMinimoId: z.string().default("cachorro"),
  /** Categoría libre para filtrar (alimento, juguete, accesorio, servicio). */
  categoria: z.enum(["alimento", "juguete", "accesorio", "servicio", "otro"]).default("otro"),
  /** Stock disponible (null = ilimitado). */
  stock: z.number().int().nonnegative().nullable().default(null),
  /** null = sin imagen en Firestore; omitir en creación hasta subir archivo. */
  imagen: z.string().url().nullish(),
  activo: z.boolean().default(true),
  /** Solo para mascotas de cierta especie (opcional). */
  especiesObjetivo: z.array(EspecieSchema).default([])
});

export type Premio = z.infer<typeof PremioSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// CANJE PENDIENTE (ticket)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Documento en /Locales/{localId}/CanjesPendientes/{canjeId}.
 *
 * Flujo:
 *   1. El cliente toca "Canjear en local" → se crea con status="pendiente".
 *      NO se descuentan huellitas todavía.
 *   2. Cliente muestra el `codigo` al admin.
 *   3. Admin lo confirma desde /admin/canjes → status pasa a "completado",
 *      se descuentan los lotes FIFO transaccionalmente.
 *   4. Si pasa `expiraEn` sin confirmarse, queda como histórico expirado.
 *
 * El `codigo` es corto (6 chars sin ambigüedades) para que el cliente lo
 * pueda dictar fácilmente al admin si la pantalla no se ve bien.
 */
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
  /**
   * Valor en pesos del descuento que representa este canje (snapshot al
   * momento de generar el ticket, usando `Premio.valorDescuento` si está,
   * o `costoHuellitas * valorMonetarioHuellita` como fallback).
   * El admin lo ve para saber qué descuento aplicar / qué producto entregar.
   */
  valorDescuento: z.number().nonnegative().optional(),
  codigo: z.string().min(4).max(20),
  estado: EstadoCanjeSchema.default("pendiente"),
  creadoEn: z.union([z.date(), z.string()]).optional(),
  expiraEn: z.string(), // ISO yyyy-mm-ddTHH:mm:ss
  confirmadoEn: z.union([z.date(), z.string()]).optional(),
  confirmadoPor: z.string().optional(), // uid del admin
  ventaId: z.string().optional(), // si se ata a una venta concreta
  /**
   * Plan FIFO de consumo de lotes (solo canjes nuevos en /Canjes).
   * Sirve para revertir si el cliente cancela o el ticket expira.
   */
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
// REFERIDOS (índice + auditoría)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Documento en /Locales/{localId}/Referidos/{codigo}
 * El ID del documento ES el código (uppercase). Garantiza unicidad por su
 * propio path: dos clientes con el mismo código no pueden coexistir.
 */
export const ReferidoIndexSchema = z.object({
  codigo: z.string().min(4).max(20),
  clienteId: z.string().min(1),
  creadoEn: z.union([z.date(), z.string()]).optional()
});
export type ReferidoIndex = z.infer<typeof ReferidoIndexSchema>;

/** Auditoría de la activación de la recompensa (idempotencia + email enviado). */
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
