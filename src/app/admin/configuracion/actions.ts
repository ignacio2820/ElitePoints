"use server";

import { revalidatePath } from "next/cache";
import {
  ConfiguracionLocalSchema,
  type ConfiguracionLocal
} from "@/lib/huellitas/types";

export async function guardarConfiguracion(
  cfg: ConfiguracionLocal
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = ConfiguracionLocalSchema.safeParse(cfg);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" };
  }
  try {
    const { setConfiguracion } = await import("@/lib/huellitas/service");
    await setConfiguracion(parsed.data.localId, parsed.data);
    revalidatePath("/admin/configuracion");
    return { ok: true };
  } catch (err) {
    // Modo demo (sin Firebase Admin): la persistencia es no-op pero la UI
    // sigue funcionando para que se pueda probar el flujo visualmente.
    if (err instanceof Error && err.message.includes("Firebase Admin")) {
      return { ok: true };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}
