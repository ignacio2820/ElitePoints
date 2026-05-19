import type {
  AtencionEncuesta,
  ProductosEncuesta,
  RespuestasEncuestaInApp,
  TiempoEsperaEncuesta
} from "./encuestasInAppTypes";

const ATENCION: Record<AtencionEncuesta, string> = {
  excelente: "Excelente",
  buena: "Buena",
  regular: "Regular",
  mala: "Mala"
};

const TIEMPO: Record<TiempoEsperaEncuesta, string> = {
  rapido: "Sí, rápido",
  normal: "Normal",
  largo: "Demasiado largo"
};

const PRODUCTOS: Record<ProductosEncuesta, string> = {
  si_todo: "Sí, todo",
  faltaron: "Faltaron cosas"
};

export function etiquetaAtencion(v?: AtencionEncuesta): string {
  return v ? ATENCION[v] : "—";
}

export function etiquetaTiempo(v?: TiempoEsperaEncuesta): string {
  return v ? TIEMPO[v] : "—";
}

export function etiquetaProductos(v?: ProductosEncuesta): string {
  return v ? PRODUCTOS[v] : "—";
}

export function etiquetasRespuestas(r?: RespuestasEncuestaInApp) {
  return {
    atencion: etiquetaAtencion(r?.atencion),
    tiempoEspera: etiquetaTiempo(r?.tiempoEspera),
    productos: etiquetaProductos(r?.productos)
  };
}
