import { Resend } from "resend";
import { emailFromAddress } from "@/lib/email/fromAddress";
import { HUELLITAS_REGALO_ENCUESTA } from "@/lib/huellitas/encuestasConstants";

let _resend: Resend | null = null;
function resend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY no configurada");
    _resend = new Resend(key);
  }
  return _resend;
}

export interface PayloadEncuestaSatisfaccion {
  emailCliente: string;
  nombreCliente: string;
  nombreLocal: string;
  urlEncuesta: string;
  huellitasRegalo?: number;
}

export function renderEmailEncuestaSatisfaccion(
  p: PayloadEncuestaSatisfaccion
): { subject: string; html: string; text: string } {
  const puntos = p.huellitasRegalo ?? HUELLITAS_REGALO_ENCUESTA;
  const subject = `¿Cómo fue tu visita a ${p.nombreLocal}?`;

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#FBF8F3;font-family:'Helvetica Neue',Arial,sans-serif;color:#1B4332;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;padding:32px 16px;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;box-shadow:0 8px 24px -8px rgba(27,67,50,0.12);overflow:hidden;">
          <tr><td style="padding:28px 40px;background:linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%);color:#fff;">
            <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;opacity:.9;">${p.nombreLocal}</div>
            <h1 style="margin:10px 0 0;font-size:26px;font-weight:700;line-height:1.25;">Tu opinión nos importa</h1>
          </td></tr>
          <tr><td style="padding:32px 40px;">
            <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hola ${p.nombreCliente},</p>
            <p style="font-size:16px;line-height:1.6;margin:0 0 20px;color:#2D6A4F;">
              Gracias por tu compra reciente. ¿Nos contás cómo fue tu experiencia?
              Solo te lleva un minuto.
            </p>
            <div style="margin:24px 0;padding:20px;border:1px solid #D8F3DC;border-radius:16px;background:#F1FAEE;">
              <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#1B4332;font-weight:700;">Regalo por tu feedback</div>
              <div style="font-size:20px;font-weight:700;margin-top:8px;color:#1B4332;">+${puntos} Puntos al completar la encuesta</div>
            </div>
            <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr><td>
                <a href="${p.urlEncuesta}" style="display:inline-block;background:#FB8500;color:#fff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:999px;box-shadow:0 8px 18px -8px rgba(251,133,0,0.55);">
                  Calificar con Puntos
                </a>
              </td></tr>
            </table>
            <p style="font-size:13px;line-height:1.5;color:#52796F;margin:0 0 8px;">
              Si el botón no funciona, copiá este enlace en tu navegador:
            </p>
            <p style="font-size:12px;word-break:break-all;margin:0;">
              <a href="${p.urlEncuesta}" style="color:#E67700;">${p.urlEncuesta}</a>
            </p>
            <p style="font-size:14px;color:#52796F;margin:28px 0 0;">Con cariño, el equipo de ${p.nombreLocal}.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text =
    `Hola ${p.nombreCliente},\n\n` +
    `¿Cómo fue tu experiencia en ${p.nombreLocal}? Completá la encuesta y sumá ${puntos} Puntos:\n` +
    `${p.urlEncuesta}\n`;

  return { subject, html, text };
}

export async function enviarEmailEncuestaSatisfaccion(
  p: PayloadEncuestaSatisfaccion
): Promise<void> {
  const from = emailFromAddress();
  const { subject, html, text } = renderEmailEncuestaSatisfaccion(p);
  await resend().emails.send({
    from,
    to: p.emailCliente,
    subject,
    html,
    text
  });
}
