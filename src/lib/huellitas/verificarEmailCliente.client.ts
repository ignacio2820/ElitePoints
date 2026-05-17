import { ERROR_EMAIL_CLIENTE_DUPLICADO } from "@/lib/huellitas/validarEmailCliente";

export { ERROR_EMAIL_CLIENTE_DUPLICADO };

/**
 * Consulta al servidor si el email de cliente está disponible.
 * Devuelve `null` si está libre, o el mensaje de error si ya existe.
 */
export async function validarEmailClienteAntesDeGuardar(
  email: string,
  localId?: string
): Promise<string | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;

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
      return ERROR_EMAIL_CLIENTE_DUPLICADO;
    }
    return null;
  } catch {
    return "No pudimos verificar el email. Revisá tu conexión e intentá de nuevo.";
  }
}
