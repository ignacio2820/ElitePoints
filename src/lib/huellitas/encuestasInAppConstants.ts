import type {
  AtencionEncuesta,
  ProductosEncuesta,
  TiempoEsperaEncuesta
} from "./encuestasInAppTypes";

export const PREGUNTAS_ENCUESTA_IN_APP = [
  {
    id: "atencion" as const,
    titulo: "¿Cómo calificarías la atención de hoy?",
    opciones: [
      { value: "excelente" as AtencionEncuesta, label: "Excelente" },
      { value: "buena" as AtencionEncuesta, label: "Buena" },
      { value: "regular" as AtencionEncuesta, label: "Regular" },
      { value: "mala" as AtencionEncuesta, label: "Mala" }
    ]
  },
  {
    id: "tiempoEspera" as const,
    titulo: "¿El tiempo de espera fue el adecuado?",
    opciones: [
      { value: "rapido" as TiempoEsperaEncuesta, label: "Sí, rápido" },
      { value: "normal" as TiempoEsperaEncuesta, label: "Normal" },
      { value: "largo" as TiempoEsperaEncuesta, label: "Demasiado largo" }
    ]
  },
  {
    id: "productos" as const,
    titulo: "¿Encontraste los productos que buscabas?",
    opciones: [
      { value: "si_todo" as ProductosEncuesta, label: "Sí, todo" },
      { value: "faltaron" as ProductosEncuesta, label: "Faltaron cosas" }
    ]
  }
] as const;
