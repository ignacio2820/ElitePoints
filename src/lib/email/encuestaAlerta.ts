import { Resend } from "resend";
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

export interface PayloadEmailAlertaEncuesta {
  emailDueno: string;
  nombreLocal: string;
  nombreCliente: string;
  puntuacion: number;
  comentario?: string;
  encuestaId: string;
}

export async function enviarEmailAlertaEncuestaBaja(
  p: PayloadEmailAlertaEncuesta
): Promise<void> {
  const subject = `⚠️ ALERTA: calificación baja de ${p.nombreCliente}`;
  const comentarioHtml = p.comentario
    ? `<p style="margin:12px 0;padding:12px;background:#FEF2F2;border-radius:12px;color:#991B1B;font-size:14px;">"${p.comentario.replace(/</g, "&lt;")}"</p>`
    : "";

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#FBF8F3;font-family:Arial,sans-serif;color:#1B4332;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px;">
      <tr><td align="center">
        <table width="520" style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid #FECACA;">
          <tr><td style="padding:24px 28px;background:#FEE2E2;color:#991B1B;">
            <strong>⚠️ ALERTA</strong>
            <h1 style="margin:8px 0 0;font-size:20px;">Calificación baja en ${p.nombreLocal}</h1>
          </td></tr>
          <tr><td style="padding:28px;">
            <p style="font-size:15px;line-height:1.5;">
              El cliente <strong>${p.nombreCliente}</strong> dejó
              <strong>${p.puntuacion} / 5</strong> puntos en la encuesta post-compra.
            </p>
            ${comentarioHtml}
            <p style="font-size:13px;color:#52796F;margin-top:20px;">
              Revisá el panel de Clientes → Alertas para enviar una disculpa con Puntos compensatorias.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text =
    `⚠️ ALERTA: El cliente ${p.nombreCliente} ha dejado una calificación baja (${p.puntuacion}/5).\n` +
    (p.comentario ? `Comentario: ${p.comentario}\n` : "") +
    `Encuesta: ${p.encuestaId}`;

  await resend().emails.send({
    from: emailFromAddress(),
    to: p.emailDueno,
    subject,
    html,
    text
  });
}
