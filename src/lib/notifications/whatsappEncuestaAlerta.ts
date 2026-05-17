export type WhatsAppEncuestaAlertaPayload = {
  telefono: string;
  mensaje: string;
  metadata?: Record<string, string>;
};

export type WhatsAppEncuestaAlertaResult = {
  enviado: boolean;
  omitido: boolean;
  status?: number;
  error?: string;
};

/** Webhook genérico (Twilio / WhatsApp Business API). */
export async function enviarWhatsAppEncuestaAlerta(
  payload: WhatsAppEncuestaAlertaPayload
): Promise<WhatsAppEncuestaAlertaResult> {
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
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: telefono,
        body: payload.mensaje,
        metadata: payload.metadata ?? {}
      })
    });
    if (!res.ok) {
      return {
        enviado: false,
        omitido: false,
        status: res.status,
        error: await res.text().catch(() => res.statusText)
      };
    }
    return { enviado: true, omitido: false, status: res.status };
  } catch (err) {
    return {
      enviado: false,
      omitido: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
