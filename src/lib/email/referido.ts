import { Resend } from "resend";

let _resend: Resend | null = null;
function resend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY no configurada");
    _resend = new Resend(key);
  }
  return _resend;
}

export interface PayloadReferidoActivado {
  emailReferente: string;
  nombreReferente: string;
  nombreInvitado: string;
  huellitasGanadas: number;
  nombreLocal: string;
  saldoActualReferente?: number;
}

export function renderEmailReferidoActivado(p: PayloadReferidoActivado): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `¡Buenas noticias! Tu amigo ${p.nombreInvitado} ya visitó la veterinaria`;

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#FBF8F3;font-family:'Helvetica Neue',Arial,sans-serif;color:#221308;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;padding:32px 16px;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;box-shadow:0 8px 24px -8px rgba(60,40,20,0.10);overflow:hidden;">
          <tr><td style="padding:32px 40px;background:linear-gradient(135deg,#8B5E3C 0%,#E07A5F 100%);color:#FBF8F3;">
            <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;opacity:.85;">${p.nombreLocal}</div>
            <h1 style="margin:8px 0 0;font-size:26px;font-weight:600;">¡Buenas noticias, ${p.nombreReferente}!</h1>
          </td></tr>
          <tr><td style="padding:32px 40px;">
            <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
              Tu amigo <strong>${p.nombreInvitado}</strong> ya visitó la veterinaria
              y le sumamos sus primeras huellitas con tu código.
            </p>
            <div style="margin:24px 0;padding:20px;border:1px dashed #C9AE8C;border-radius:16px;background:#FBF8F3;">
              <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#8B5E3C;">Tu recompensa</div>
              <div style="font-size:30px;font-weight:600;margin-top:6px;">+${p.huellitasGanadas} Huellitas 🐾</div>
              <div style="font-size:14px;color:#54331A;margin-top:6px;">Acreditadas en tu cuenta. Disponibles para canjear ahora.</div>
              ${p.saldoActualReferente !== undefined
                ? `<div style="margin-top:12px;font-size:13px;color:#54331A;">Saldo actual: <strong>${p.saldoActualReferente} huellitas</strong></div>`
                : ""}
            </div>
            <p style="font-size:14px;line-height:1.6;color:#54331A;margin:0 0 8px;">
              ¿Conocés a más amigos que tengan mascota? Compartiles tu código
              desde la app y seguí sumando huellitas mientras los ayudás a
              cuidar a sus compañeros.
            </p>
            <p style="font-size:13px;color:#6B5848;margin:24px 0 0;">Con cariño, el equipo de ${p.nombreLocal}.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text =
    `¡Buenas noticias, ${p.nombreReferente}!\n\n` +
    `Tu amigo ${p.nombreInvitado} ya visitó la veterinaria.\n` +
    `Sumaste ${p.huellitasGanadas} Huellitas de regalo en ${p.nombreLocal}.\n` +
    (p.saldoActualReferente !== undefined
      ? `Saldo actual: ${p.saldoActualReferente} huellitas.\n`
      : "");

  return { subject, html, text };
}

export async function enviarEmailReferidoActivado(
  p: PayloadReferidoActivado
): Promise<void> {
  const from = process.env.RESEND_FROM ?? "Huellitas <hola@huellitas.app>";
  const { subject, html, text } = renderEmailReferidoActivado(p);
  await resend().emails.send({
    from,
    to: p.emailReferente,
    subject,
    html,
    text
  });
}
