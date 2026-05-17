import { z } from "zod";

export const EstadoSorteoSchema = z.enum(["activo", "terminado"]);
export type EstadoSorteo = z.infer<typeof EstadoSorteoSchema>;

export const ParticipanteSorteoSchema = z.object({
  clienteId: z.string().min(1),
  peso: z.number().int().positive().max(99)
});

export type ParticipanteSorteo = z.infer<typeof ParticipanteSorteoSchema>;

export const SorteoSchema = z.object({
  id: z.string().optional(),
  localId: z.string().min(1),
  premio: z.string().min(1).max(120),
  descripcion: z.string().max(2000).default(""),
  imagen: z.string().url().max(8192).optional().or(z.literal("")),
  fechaHoraFin: z.string().min(1),
  estado: EstadoSorteoSchema,
  /** `todos` o id de nivel (umbral mínimo de huellitas históricas). */
  nivelMinimo: z.string().min(1).max(40),
  participantes: z.array(ParticipanteSorteoSchema).default([]),
  ganadorId: z.string().nullable().optional(),
  ganadorNombre: z.string().nullable().optional(),
  finalizadoEn: z.string().optional(),
  creadoEn: z.string().optional()
});

export type Sorteo = z.infer<typeof SorteoSchema>;

export type ClienteElegibleSorteo = {
  clienteId: string;
  nombre: string;
  email: string;
  telefono: string;
  peso: number;
};

export const COSTO_BOOST_DUPLICAR = 5;
export const COSTO_BOOST_TRIPLICAR = 10;
export const PESO_BASE = 1;
export const PESO_DUPLICAR = 2;
export const PESO_TRIPLICAR = 3;
