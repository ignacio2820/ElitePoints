"use server";

import { z } from "zod";
import { crearLocalYOnboarding } from "@/lib/huellitas/onboardingService";
import { enviarEmailBienvenidaPetShop } from "@/lib/email/bienvenidaPetShop";
import { appBaseUrlForAuth } from "@/lib/auth/continueUrl";
import { mayExposeDevMagicLink } from "@/lib/auth/allowedOrigins";
import { subirLogoLocal } from "@/lib/storage/uploadLogo";

const Campos = z.object({
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
    .refine((v) => v.length >= 8, "Ingresá un WhatsApp válido")
});

export type OnboardingState =
  | { status: "idle" }
  | { status: "ok"; localId: string; sent: boolean; devLink?: string }
  | { status: "error"; error: string };

function esImagenLogo(file: File): boolean {
  const tipo = file.type.toLowerCase();
  if (tipo === "image/jpeg" || tipo === "image/png") return true;
  const nombre = file.name.toLowerCase();
  return (
    nombre.endsWith(".jpg") ||
    nombre.endsWith(".jpeg") ||
    nombre.endsWith(".png")
  );
}

export async function registrarPetShop(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const logoFile = formData.get("logo");
  if (!(logoFile instanceof File) || logoFile.size === 0) {
    return { status: "error", error: "Subí el logo del local (JPG, JPEG o PNG)." };
  }
  if (!esImagenLogo(logoFile)) {
    return {
      status: "error",
      error: "El logo debe ser una imagen JPG, JPEG o PNG."
    };
  }

  const raw = Object.fromEntries(
    [...formData.entries()].filter(([k]) => k !== "logo")
  );
  const parsed = Campos.safeParse(raw);
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
    logoUrl: ""
  });

  if (!r.ok) {
    return { status: "error", error: r.error };
  }

  const { localId, magicLink } = r;

  try {
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    await subirLogoLocal(localId, buffer, logoFile.type || undefined);
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : "No pudimos guardar el logo del local.";
    return { status: "error", error: msg };
  }

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
      if (mayExposeDevMagicLink()) {
        return { status: "ok", localId, sent: false, devLink: magicLink };
      }
      return {
        status: "error",
        error:
          "No pudimos enviar el email de acceso. Revisá RESEND_API_KEY o intentá más tarde."
      };
    }
  }

  if (mayExposeDevMagicLink()) {
    return { status: "ok", localId, sent: false, devLink: magicLink };
  }

  return {
    status: "error",
    error:
      "Configurá RESEND_API_KEY para recibir el link de acceso por email en producción."
  };
}
