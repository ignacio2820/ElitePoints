"use client";

import { doc, updateDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase/client";

/**
 * Persiste `logoUrl` en `Locales/{localId}` (Firestore).
 * 1) updateDoc en cliente si hay Firebase Auth (actualiza header en vivo).
 * 2) POST Admin SDK como fuente de verdad (sesión httpOnly).
 */
export async function persistirLogoUrlEnFirestore(
  localId: string,
  logoUrl: string
): Promise<string> {
  const url = logoUrl.trim();
  const payload = url ? { logoUrl: url } : { logoUrl: "" as const };

  if (url && isFirebaseConfigured() && auth.currentUser) {
    try {
      await updateDoc(doc(db, "Locales", localId), { logoUrl: url });
    } catch {
      // Reglas / Auth: el POST con Admin SDK sigue siendo obligatorio.
    }
  }

  const res = await fetch("/api/admin/local/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload)
  });
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    info?: { logoUrl?: string | null };
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "No pudimos guardar la URL del logo en Firestore");
  }

  if (!url) return "";
  const guardada =
    (typeof data.info?.logoUrl === "string" && data.info.logoUrl.trim()) || url;
  return guardada;
}
