/** Huellitas de regalo al completar la encuesta de satisfacción. */
export const HUELLITAS_REGALO_ENCUESTA = 5;

/** Puntuación 1–2 dispara alerta crítica de insatisfacción. */
export const UMBRAL_ALERTA_INSATISFACCION = 3;

/** Opciones de compensación al enviar disculpa desde admin. */
export const HUELLITAS_OPCIONES_DISCULPA = [10, 20, 50] as const;

/** Delay hasta habilitar el enlace (24 h por defecto). */
export const ENCUESTA_DELAY_MS =
  Number(process.env.ENCUESTA_DELAY_MINUTOS) > 0
    ? Number(process.env.ENCUESTA_DELAY_MINUTOS) * 60_000
    : 24 * 60 * 60_000;
