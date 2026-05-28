/**
 * Integración preparada para proveedores tipo Twilio / WhatsApp Business API.
 * Configurá WHATSAPP_WEBHOOK_URL (y opcional WHATSAPP_WEBHOOK_TOKEN) en el entorno.
 */

export type WhatsAppSorteoPayload = {
  telefono: string;
  nombre: string;
  nombreLocal: string;
  mensaje: string;
  metadata?: Record<string, string>;
};

export type WhatsAppSorteoResult = {
  enviado: boolean;
  omitido: boolean;
  status?: number;
  error?: string;
};

export function mensajeWhatsAppLanzamientoSorteo(nombre: string): string {
  const primerNombre = nombre.split(" ")[0] ?? nombre;
  return `¡Hola ${primerNombre}! Hay un nuevo sorteo en tu comercio. Entrá a la app y multiplicá tus chances con tus puntos.`;
}

export async function enviarWhatsAppSorteo(
  payload: WhatsAppSorteoPayload
): Promise<WhatsAppSorteoResult> {
  const url = process.env.WHATSAPP_WEBHOOK_URL?.trim();
  if (!url) {
    return { enviado: false, omitido: true };
  }

  const telefono = payload.telefono.trim();
  if (!telefono) {
    return { enviado: false, omitido: true, error: "Sin teléfono" };
  }

  const token = process.env.WHATSAPP_WEBHOOK_TOKEN?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: telefono,
        message: payload.mensaje,
        nombre: payload.nombre,
        nombreLocal: payload.nombreLocal,
        metadata: {
          tipo: "sorteo",
          ...payload.metadata
        }
      }),
      signal: AbortSignal.timeout(15_000)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        enviado: false,
        omitido: false,
        status: res.status,
        error: text.slice(0, 200) || res.statusText
      };
    }

    return { enviado: true, omitido: false, status: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de red";
    return { enviado: false, omitido: false, error: msg };
  }
}
