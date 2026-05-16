/**
 * Sonidos de éxito sintéticos (Web Audio API). Sin archivos externos.
 * Protegido con try/catch para no bloquear la UI si el navegador rechaza audio.
 */

type PerfilSonido = {
  duracionMs: number;
  frecuenciaInicio: number;
  frecuenciaFin: number;
  volumen: number;
};

const PERFIL_VENTA: PerfilSonido = {
  duracionMs: 150,
  frecuenciaInicio: 880,
  frecuenciaFin: 1200,
  volumen: 0.22
};

const PERFIL_CANJE: PerfilSonido = {
  duracionMs: 160,
  frecuenciaInicio: 784,
  frecuenciaFin: 1175,
  volumen: 0.2
};

let audioContext: AudioContext | null = null;

function obtenerContextoAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctx =
      window.AudioContext ??
      (
        window as Window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioContext) audioContext = new Ctx();
    if (audioContext.state === "suspended") {
      void audioContext.resume().catch(() => {});
    }
    return audioContext;
  } catch {
    return null;
  }
}

function reproducirPerfil(perfil: PerfilSonido): void {
  try {
    const ctx = obtenerContextoAudio();
    if (!ctx) return;

    const duracion = perfil.duracionMs / 1000;
    const t0 = ctx.currentTime;
    const fin = Math.max(perfil.frecuenciaFin, 1);

    const oscilador = ctx.createOscillator();
    const ganancia = ctx.createGain();

    oscilador.type = "sine";
    oscilador.frequency.setValueAtTime(perfil.frecuenciaInicio, t0);
    oscilador.frequency.exponentialRampToValueAtTime(fin, t0 + duracion);

    ganancia.gain.setValueAtTime(0.001, t0);
    ganancia.gain.exponentialRampToValueAtTime(perfil.volumen, t0 + 0.012);
    ganancia.gain.exponentialRampToValueAtTime(0.001, t0 + duracion);

    oscilador.connect(ganancia);
    ganancia.connect(ctx.destination);
    oscilador.start(t0);
    oscilador.stop(t0 + duracion + 0.02);
  } catch {
    // Autoplay bloqueado o Web Audio no soportado
  }
}

/** Ping ascendente al registrar una venta en caja. */
export function reproducirSonidoExitoVenta(): void {
  reproducirPerfil(PERFIL_VENTA);
}

/** Tono ligeramente más grave al confirmar un canje. */
export function reproducirSonidoExitoCanje(): void {
  reproducirPerfil(PERFIL_CANJE);
}
