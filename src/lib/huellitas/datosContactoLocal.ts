import type { InfoLocal } from "./localService";

/** Datos de contacto del comercio (veterinaria / pet shop) para el portal cliente. */
export interface DatosContactoLocal {
  nombreLocal: string;
  direccion?: string;
  telefonoWhatsapp?: string;
  telefonoUrgencias?: string;
  /** Email de consultas / soporte definido por el comercio. */
  emailSoporte?: string;
  horariosAtencion?: string;
}

function limpiar(valor: string | null | undefined): string | undefined {
  const t = valor?.trim();
  return t ? t : undefined;
}

/**
 * Arma el payload del modal de Ayuda desde el documento del local en Firestore.
 */
export function datosContactoDesdeInfoLocal(
  info: Pick<
    InfoLocal,
    | "nombre"
    | "direccion"
    | "telefonoWhatsapp"
    | "telefonoUrgencias"
    | "email"
    | "horariosAtencion"
  >,
  nombreFallback?: string
): DatosContactoLocal {
  return {
    nombreLocal: limpiar(info.nombre) ?? nombreFallback ?? "Tu local",
    direccion: limpiar(info.direccion),
    telefonoWhatsapp: limpiar(info.telefonoWhatsapp),
    telefonoUrgencias: limpiar(info.telefonoUrgencias),
    emailSoporte: limpiar(info.email),
    horariosAtencion: limpiar(info.horariosAtencion)
  };
}

export function tieneDatosContactoComercio(datos: DatosContactoLocal): boolean {
  return !!(
    datos.direccion ||
    datos.telefonoWhatsapp ||
    datos.telefonoUrgencias ||
    datos.emailSoporte ||
    datos.horariosAtencion
  );
}
