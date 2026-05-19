import { z } from "zod";

export const AtencionEncuestaSchema = z.enum([
  "excelente",
  "buena",
  "regular",
  "mala"
]);
export type AtencionEncuesta = z.infer<typeof AtencionEncuestaSchema>;

export const TiempoEsperaEncuestaSchema = z.enum(["rapido", "normal", "largo"]);
export type TiempoEsperaEncuesta = z.infer<typeof TiempoEsperaEncuestaSchema>;

export const ProductosEncuestaSchema = z.enum(["si_todo", "faltaron"]);
export type ProductosEncuesta = z.infer<typeof ProductosEncuestaSchema>;

export const RespuestasEncuestaInAppSchema = z.object({
  atencion: AtencionEncuestaSchema,
  tiempoEspera: TiempoEsperaEncuestaSchema,
  productos: ProductosEncuestaSchema
});

export type RespuestasEncuestaInApp = z.infer<typeof RespuestasEncuestaInAppSchema>;

export const EnviarEncuestaInAppBodySchema = z.object({
  token: z.string().min(16),
  respuestas: RespuestasEncuestaInAppSchema,
  comentario: z.string().max(2000).optional()
});

/** Documento en la colección raíz `encuestas_satisfaccion`. */
export const EncuestaSatisfaccionDocSchema = z.object({
  localId: z.string().min(1),
  clienteId: z.string().min(1),
  ventaId: z.string().min(1),
  token: z.string().min(1),
  creadoEn: z.string(),
  respuestas: RespuestasEncuestaInAppSchema,
  comentario: z.string().max(2000).optional(),
  canal: z.literal("in_app"),
  puntuacionDerivada: z.number().int().min(1).max(5),
  encuestaLocalId: z.string().optional()
});

export type EncuestaSatisfaccionDoc = z.infer<typeof EncuestaSatisfaccionDocSchema>;
