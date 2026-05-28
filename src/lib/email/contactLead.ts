import { Resend } from "resend";
import { CONTACT_EMAIL } from "@/lib/contact";
import { emailFromAddress } from "@/lib/email/fromAddress";

let _resend: Resend | null = null;
function resend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY no configurada");
    _resend = new Resend(key);
  }
  return _resend;
}

export type ContactLeadPayload = {
  nombreCompleto: string;
  nombreComercio: string;
  email: string;
  telefono: string;
  consulta: string;
};

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function enviarEmailContactoLead(
  p: ContactLeadPayload
): Promise<void> {
  const subject = `ElitePoints — Demo: ${p.nombreComercio}`;
  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;font-family:Arial,sans-serif;color:#1B4332;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 16px;">Nueva solicitud desde la landing</h2>
      <p><strong>Nombre:</strong> ${escHtml(p.nombreCompleto)}</p>
      <p><strong>Comercio:</strong> ${escHtml(p.nombreComercio)}</p>
      <p><strong>Email:</strong> ${escHtml(p.email)}</p>
      <p><strong>Teléfono / WhatsApp:</strong> ${escHtml(p.telefono)}</p>
      <p style="margin-top:16px;"><strong>Consulta:</strong></p>
      <p style="white-space:pre-wrap;line-height:1.5;">${escHtml(p.consulta)}</p>
    </div>
  </body>
</html>`;

  const text =
    `Nueva solicitud ElitePoints\n\n` +
    `Nombre: ${p.nombreCompleto}\n` +
    `Comercio: ${p.nombreComercio}\n` +
    `Email: ${p.email}\n` +
    `Teléfono: ${p.telefono}\n\n` +
    `Consulta:\n${p.consulta}\n`;

  await resend().emails.send({
    from: emailFromAddress(),
    to: CONTACT_EMAIL,
    replyTo: p.email,
    subject,
    html,
    text
  });
}
