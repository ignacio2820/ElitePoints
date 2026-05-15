import { CONTACT_EMAIL } from "@/lib/contact";

/** Remitente transaccional con marca MascotPoints. */
export function emailFromAddress(): string {
  return (
    process.env.RESEND_FROM?.trim() ||
    `MascotPoints <${CONTACT_EMAIL}>`
  );
}
