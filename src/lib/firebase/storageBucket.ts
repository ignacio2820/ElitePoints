/** Quita comillas dobles residuales al inicio/fin (Vercel / JSON pegado). */
function stripSurroundingDoubleQuotes(s: string): string {
  let t = s;
  for (let i = 0; i < 12; i++) {
    const next = t.replace(/^"|"$/g, "").trim();
    if (next === t) break;
    t = next;
  }
  return t;
}

/**
 * Limpia valores de entorno (Vercel, .env copiado con JSON, etc.) para Firebase.
 * Evita bucket inválido tipo ""proyecto.firebasestorage.app"".
 */
export function sanitizePublicEnvString(
  raw: string | undefined | null
): string | undefined {
  if (raw == null) return undefined;
  let s = String(raw).trim();
  if (!s) return undefined;

  for (let i = 0; i < 10; i++) {
    const antes = s;
    if (s.startsWith('"') && s.endsWith('"')) {
      s = s.slice(1, -1).trim();
    } else if (s.startsWith("'") && s.endsWith("'")) {
      s = s.slice(1, -1).trim();
    }
    if (s === antes) break;
  }

  s = s.replace(/^\\"/, "").replace(/\\"$/, "").trim();
  return s || undefined;
}

/** Nombre del bucket de Storage (sin gs:// ni slashes ni comillas). */
export function getFirebaseStorageBucket(): string | undefined {
  const base = sanitizePublicEnvString(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  );
  if (!base) return undefined;
  return stripSurroundingDoubleQuotes(base) || undefined;
}
