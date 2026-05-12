import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import { enviarEmailMembresiaPorVencer } from "@/lib/email/membresiaPorVencer";
import type { InfoLocal } from "./localService";
import { diasHastaVencimiento, membresiaPorVencer } from "./membresia";
import { appBaseUrlForAuth } from "@/lib/auth/continueUrl";

const DIAS_UMBRAL = 7;
const HORAS_ENTRE_AVISOS = 72;

export async function notificarMembresiaPorVencerSiCorresponde(
  info: InfoLocal
): Promise<void> {
  if (!membresiaPorVencer(info, DIAS_UMBRAL)) return;
  const email = info.email?.trim();
  if (!email) return;

  const db = adminDb();
  const ref = cols.local(db, info.id);
  const snap = await ref.get();
  const data = snap.data() as { ultimoAvisoMembresiaEn?: Timestamp } | undefined;
  const ultimo = data?.ultimoAvisoMembresiaEn?.toDate();
  if (ultimo && Date.now() - ultimo.getTime() < HORAS_ENTRE_AVISOS * 60 * 60 * 1000) {
    return;
  }

  const dias = diasHastaVencimiento(info);
  if (dias === null || dias <= 0) return;

  const baseUrl = appBaseUrlForAuth();
  const renovarUrl = `${baseUrl}/admin/pagos`;
  const fechaVencimiento = info.fechaVencimiento
    ? info.fechaVencimiento.toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      })
    : "pronto";

  if (!process.env.RESEND_API_KEY) return;

  try {
    await enviarEmailMembresiaPorVencer({
      to: email,
      nombreLocal: info.nombre,
      diasRestantes: dias,
      fechaVencimiento,
      renovarUrl
    });
    await ref.set({ ultimoAvisoMembresiaEn: Timestamp.now() }, { merge: true });
  } catch {
    // Si falla el email, no bloqueamos el panel.
  }
}
