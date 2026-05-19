import { z } from "zod";
import { HUELLITAS_OPCIONES_DISCULPA } from "@/lib/huellitas/encuestasConstants";

export const EstadoInvitacionEncuestaSchema = z.enum([
  "pendiente",
  "completada",
  "expirada"
]);

export type EstadoInvitacionEncuesta = z.infer<typeof EstadoInvitacionEncuestaSchema>;

export const EstadoAtencionEncuestaSchema = z.enum(["pendiente", "resuelta"]);

export type EstadoAtencionEncuesta = z.infer<typeof EstadoAtencionEncuestaSchema>;

export const InvitacionEncuestaSchema = z.object({
  token: z.string().min(16),
  localId: z.string().min(1),
  clienteId: z.string().min(1),
  ventaId: z.string().min(1),
  fechaVenta: z.string(),
  fechaEnvioEncuesta: z.string(),
  estado: EstadoInvitacionEncuestaSchema,
  encuestaId: z.string().optional(),
  emailEnviado: z.boolean().optional(),
  emailEnviadoEn: z.string().optional(),
  /** Pop-up en la app del cliente (inmediato tras la venta). */
  disponibleEnApp: z.boolean().optional(),
  /** @deprecated Usar `disponibleEnApp`. Si true, el cron de email no enviaba. */
  soloInApp: z.boolean().optional(),
  completadaEnApp: z.boolean().optional(),
  completadaEn: z.string().optional(),
  creadoEn: z.string().optional()
});

export type InvitacionEncuesta = z.infer<typeof InvitacionEncuestaSchema>;

export const EncuestaRespuestaSchema = z.object({
  id: z.string().optional(),
  localId: z.string().min(1),
  clienteId: z.string().min(1),
  ventaId: z.string().min(1),
  token: z.string().min(1),
  puntuacion: z.number().int().min(1).max(5),
  comentario: z.string().max(2000).optional(),
  huellitasRegalo: z.number().int().positive(),
  creadoEn: z.string().optional(),
  requiereAtencion: z.boolean().optional(),
  estado: EstadoAtencionEncuestaSchema.optional(),
  resueltoPorUid: z.string().optional(),
  resueltoPorEmail: z.string().optional().nullable(),
  resueltoEn: z.string().optional(),
  disculpaHuellitas: z.number().int().positive().optional(),
  disculpaNota: z.string().max(500).optional()
});

export type EncuestaRespuesta = z.infer<typeof EncuestaRespuestaSchema>;

export const EnviarEncuestaBodySchema = z.object({
  puntuacion: z.number().int().min(1).max(5),
  comentario: z.string().max(2000).optional()
});

export const EnviarDisculpaBodySchema = z.object({
  huellitas: z.union([
    z.literal(HUELLITAS_OPCIONES_DISCULPA[0]),
    z.literal(HUELLITAS_OPCIONES_DISCULPA[1]),
    z.literal(HUELLITAS_OPCIONES_DISCULPA[2])
  ]),
  nota: z.string().trim().min(3).max(500)
});
