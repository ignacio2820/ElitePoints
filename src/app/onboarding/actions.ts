"use server";

import { z } from "zod";
import { crearLocalYOnboarding } from "@/lib/huellitas/onboardingService";
import { enviarEmailBienvenidaPetShop } from "@/lib/email/bienvenidaPetShop";
import { appBaseUrlForAuth } from "@/lib/auth/continueUrl";

/**
 * Server Action de onboarding del Pet Shop.
 *
 * - Recibe los datos del formulario, valida con Zod.
 * - Llama al servicio que usa el Admin SDK (crear local + claims + magic link).
 * - Si Resend está configurado, manda el magic link por email.
 * - Si NO (modo dev), devuelve el link en la respuesta para que el dueño
 *   pueda continuar al panel directamente.
 *
 * No setea sesión: la sesión se crea cuando el dueño abre el magic link
 * y pasa por /login/verify.
 */

const Input = z.object({
  email: z
    .string()
    .min(3, "Email inválido")
    .email("Email inválido")
    .transform((s) => s.trim().toLowerCase()),
  nombreLocal: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre es demasiado largo"),
  direccion: z
    .string()
    .min(3, "Ingresá la dirección del local")
    .max(300, "La dirección es demasiado larga")
    .transform((s) => s.trim()),
  telefonoWhatsapp: z
    .string()
    .min(1, "Ingresá el teléfono de WhatsApp")
    .max(30, "Teléfono demasiado largo")
    .transform((v) => v.replace(/[^0-9]/g, ""))
    .refine((v) => v.length >= 8, "Ingresá un WhatsApp válido"),
  logoUrl: z
    .string()
    .min(1, "Elegí el logo del local")
    .max(500)
    .refine((v) => /^https?:\/\//.test(v.trim()), "El logo debe ser una URL https://...")
    .transform((v) => v.trim())
});

export type OnboardingState =
  | { status: "idle" }
  | { status: "ok"; localId: string; sent: boolean; devLink?: string }
  | { status: "error"; error: string };

export async function registrarPetShop(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = Input.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return { status: "error", error: msg };
  }
  const data = parsed.data;

  const r = await crearLocalYOnboarding({
    emailDueno: data.email,
    nombreLocal: data.nombreLocal,
    direccion: data.direccion,
    telefonoWhatsapp: data.telefonoWhatsapp,
    logoUrl: data.logoUrl
  });

  if (!r.ok) {
    return { status: "error", error: r.error };
  }

  const { localId, magicLink } = r;

  // Si Resend está configurado, mandamos email de bienvenida (con el magic
  // link embebido + 4 tips de onboarding). Si falla o no hay Resend,
  // devolvemos el link al cliente para que toque "Continuar al panel".
  const baseUrl = appBaseUrlForAuth();

  const haveResend = !!process.env.RESEND_API_KEY;
  if (haveResend) {
    try {
      await enviarEmailBienvenidaPetShop({
        to: data.email,
        magicLink,
        nombreLocal: data.nombreLocal,
        slugLocal: localId,
        baseUrl
      });
      return { status: "ok", localId, sent: true };
    } catch {
      // Si falla el email, devolvemos el link igual: el dueño no queda atrapado.
      return { status: "ok", localId, sent: false, devLink: magicLink };
    }
  }

  return { status: "ok", localId, sent: false, devLink: magicLink };
}
