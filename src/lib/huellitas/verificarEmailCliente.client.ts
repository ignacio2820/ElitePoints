import {
  CODIGO_ERROR_EMAIL_DUPLICADO,
  MENSAJE_EMAIL_DUPLICADO_ADMIN,
  MENSAJE_EMAIL_DUPLICADO_EN_LOCAL
} from "@/lib/auth/persistenciaCliente";

export {
  CODIGO_ERROR_EMAIL_DUPLICADO,
  MENSAJE_EMAIL_DUPLICADO_ADMIN,
  MENSAJE_EMAIL_DUPLICADO_EN_LOCAL
};

export const ERROR_EMAIL_CLIENTE_DUPLICADO = MENSAJE_EMAIL_DUPLICADO_EN_LOCAL;

/**
 * Consulta al servidor si el email está libre en el local.
 * Devuelve `null` si está libre, o el mensaje de error si ya existe.
 */
export async function validarEmailClienteAntesDeGuardar(
  email: string,
  localId: string
): Promise<string | null> {
  const e = email.trim().toLowerCase();
  if (!e || !localId.trim()) return null;

  try {
    const r = await fetch("/api/clientes/verificar-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: e, localId })
    });
    const data = (await r.json()) as {
      ok: boolean;
      disponible?: boolean;
      error?: string;
    };
    if (!r.ok || !data.ok) {
      return data.error ?? "No pudimos verificar el email.";
    }
    if (data.disponible === false) {
      return MENSAJE_EMAIL_DUPLICADO_EN_LOCAL;
    }
    return null;
  } catch {
    return "No pudimos verificar el email. Revisá tu conexión e intentá de nuevo.";
  }
}
