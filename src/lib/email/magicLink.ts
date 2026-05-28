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

export interface PayloadMagicLink {
  to: string;
  url: string;
  nombreLocal?: string;
  rol: "admin" | "cliente";
}

export function renderEmailMagicLink(p: PayloadMagicLink): {
  subject: string;
  html: string;
  text: string;
} {
  const marca = "ElitePoints";
  const titulo =
    p.rol === "admin"
      ? `Acceso al panel — ${marca}`
      : `Tu cuenta — ${marca}`;
  const intro =
    p.rol === "admin"
      ? `Tocá el botón para entrar al panel de ${p.nombreLocal ?? "tu local"}.`
      : `Tocá el botón para ver tus Puntos en ${p.nombreLocal ?? "el local"}.`;

  const subject =
    p.rol === "admin"
      ? `${marca}: acceso al panel de ${p.nombreLocal ?? "tu local"}`
      : `${marca}: tu acceso a ${p.nombreLocal ?? "Puntos"}`;

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#FBF8F3;font-family:'Helvetica Neue',Arial,sans-serif;color:#221308;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;padding:32px 16px;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;box-shadow:0 8px 24px -8px rgba(60,40,20,0.10);overflow:hidden;">
          <tr><td style="padding:32px 40px;background:linear-gradient(135deg,#1B4332 0%,#FB8500 100%);color:#FBF8F3;">
            <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;opacity:.85;">ElitePoints</div>
            <h1 style="margin:8px 0 0;font-size:28px;font-weight:600;">${titulo}</h1>
          </td></tr>
          <tr><td style="padding:32px 40px;">
            <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">${intro}</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${p.url}" style="display:inline-block;padding:14px 32px;background:#FB8500;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:16px;">
                Ingresar ahora
              </a>
            </div>
            <p style="font-size:13px;color:#54331A;line-height:1.5;margin:24px 0 0;">
              Este enlace expira en 1 hora y solo puede usarse una vez. Si no
              pediste este acceso, podés ignorar este email.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text =
    `${titulo}\n\n${intro}\n\nIngresá acá:\n${p.url}\n\n` +
    `Este enlace expira en 1 hora y solo se puede usar una vez.\n`;

  return { subject, html, text };
}

export async function enviarEmailMagicLink(p: PayloadMagicLink): Promise<void> {
  const { subject, html, text } = renderEmailMagicLink(p);
  await resend().emails.send({
    from: emailFromAddress(),
    to: p.to,
    subject,
    html,
    text,
    headers: {
      "X-Entity-Ref-ID": `magic-${Date.now()}`
    }
  });
}
