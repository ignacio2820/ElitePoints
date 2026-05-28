import { Resend } from "resend";
import { appBaseUrlForAuth } from "@/lib/auth/continueUrl";
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

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type PayloadLanzamientoSorteo = {
  email: string;
  nombreCliente: string;
  nombreLocal: string;
  premio: string;
  descripcion: string;
  fechaCierre: string;
  nivelLabel: string;
};

export type PayloadGanadorSorteo = {
  email: string;
  nombreGanador: string;
  nombreLocal: string;
  premio: string;
  descripcion: string;
};

export function renderEmailLanzamientoSorteo(p: PayloadLanzamientoSorteo): {
  subject: string;
  html: string;
  text: string;
} {
  const primerNombre = p.nombreCliente.split(" ")[0] ?? p.nombreCliente;
  const appUrl = `${appBaseUrlForAuth()}/mi-cuenta/sorteos`;
  const cierre = new Date(p.fechaCierre).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  const subject = `¡Nuevo Sorteo en ${p.nombreLocal}! 🎟️`;

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#FBF8F3;font-family:'Helvetica Neue',Arial,sans-serif;color:#221308;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;padding:32px 16px;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;box-shadow:0 8px 24px -8px rgba(60,40,20,0.10);overflow:hidden;">
          <tr><td style="padding:32px 40px;background:linear-gradient(135deg,#8B5E3C 0%,#E07A5F 100%);color:#FBF8F3;">
            <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;opacity:.85;">${escHtml(p.nombreLocal)}</div>
            <h1 style="margin:8px 0 0;font-size:26px;font-weight:600;">¡Hay un nuevo sorteo, ${escHtml(primerNombre)}!</h1>
          </td></tr>
          <tr><td style="padding:32px 40px;">
            <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
              En <strong>${escHtml(p.nombreLocal)}</strong> lanzamos un sorteo exclusivo para clientes como vos.
              Ya estás inscripto con tu chance base.
            </p>
            <div style="margin:24px 0;padding:20px;border:1px dashed #C9AE8C;border-radius:16px;background:#FBF8F3;">
              <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#8B5E3C;">Premio</div>
              <div style="font-size:24px;font-weight:600;margin-top:6px;">${escHtml(p.premio)}</div>
              ${p.descripcion ? `<p style="font-size:14px;line-height:1.55;color:#54331A;margin:12px 0 0;">${escHtml(p.descripcion)}</p>` : ""}
              <p style="font-size:13px;color:#6B5848;margin:14px 0 0;">Cierre: <strong>${escHtml(cierre)}</strong></p>
              <p style="font-size:13px;color:#6B5848;margin:6px 0 0;">${escHtml(p.nivelLabel)}</p>
            </div>
            <p style="font-size:15px;line-height:1.6;color:#54331A;margin:20px 0 0;">
              Entrá a la app y <strong>multiplicá tus chances</strong> con tus Puntos: podés duplicar o triplicar tu peso en el sorteo antes del cierre.
            </p>
            <p style="margin:28px 0 0;text-align:center;">
              <a href="${escHtml(appUrl)}" style="display:inline-block;padding:14px 28px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:600;font-size:15px;">
                ¡Quiero participar!
              </a>
            </p>
            <p style="font-size:13px;color:#6B5848;margin:24px 0 0;">Con cariño, el equipo de ${escHtml(p.nombreLocal)}.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text =
    `¡Hola ${primerNombre}!\n\n` +
    `¡Nuevo sorteo en ${p.nombreLocal}! Premio: ${p.premio}.\n` +
    `Cierre: ${cierre}.\n` +
    `${p.nivelLabel}.\n\n` +
    `Entrá a la app para multiplicar tus chances con tus Puntos: ${appUrl}\n`;

  return { subject, html, text };
}

export function renderEmailGanadorSorteo(p: PayloadGanadorSorteo): {
  subject: string;
  html: string;
  text: string;
} {
  const primerNombre = p.nombreGanador.split(" ")[0] ?? p.nombreGanador;
  const subject = `🏆 ¡Ganaste el sorteo en ${p.nombreLocal}!`;

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#FBF8F3;font-family:'Helvetica Neue',Arial,sans-serif;color:#221308;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;padding:32px 16px;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;box-shadow:0 8px 24px -8px rgba(60,40,20,0.10);overflow:hidden;">
          <tr><td style="padding:32px 40px;background:linear-gradient(135deg,#5c3d2e 0%,#c45c3e 100%);color:#FBF8F3;">
            <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;opacity:.85;">${escHtml(p.nombreLocal)}</div>
            <h1 style="margin:8px 0 0;font-size:26px;font-weight:600;">¡Felicitaciones, ${escHtml(primerNombre)}!</h1>
          </td></tr>
          <tr><td style="padding:32px 40px;">
            <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
              El sorteo terminó y <strong>fuiste elegido al azar</strong> como ganador/a. ¡Tu mascota y vos se llevan un premio increíble!
            </p>
            <div style="margin:24px 0;padding:20px;border-radius:16px;background:#FBF8F3;border:1px solid #E8DDD4;">
              <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#8B5E3C;">Tu premio</div>
              <div style="font-size:24px;font-weight:600;margin-top:6px;">${escHtml(p.premio)}</div>
              ${p.descripcion ? `<p style="font-size:14px;line-height:1.55;color:#54331A;margin:12px 0 0;">${escHtml(p.descripcion)}</p>` : ""}
            </div>
            <p style="font-size:15px;line-height:1.65;color:#54331A;margin:20px 0 0;">
              <strong>¿Cómo retirarlo?</strong> Acercate al local <strong>${escHtml(p.nombreLocal)}</strong> con tu documento o el email de esta cuenta.
              El equipo te va a entregar el premio y validar tu identidad en el mostrador.
            </p>
            <p style="font-size:14px;line-height:1.6;color:#6B5848;margin:16px 0 0;">
              Si tenés dudas, respondé este correo o consultá directamente en el local. ¡Gracias por ser parte de ElitePoints!
            </p>
            <p style="font-size:13px;color:#6B5848;margin:24px 0 0;">Con cariño, el equipo de ${escHtml(p.nombreLocal)}.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text =
    `¡Felicitaciones, ${primerNombre}!\n\n` +
    `Ganaste el sorteo de ${p.nombreLocal}. Premio: ${p.premio}.\n\n` +
    `Retiralo en el local presentando tu documento o este email.\n`;

  return { subject, html, text };
}

export async function enviarEmailLanzamientoSorteo(
  p: PayloadLanzamientoSorteo
): Promise<void> {
  const { subject, html, text } = renderEmailLanzamientoSorteo(p);
  await resend().emails.send({
    from: emailFromAddress(),
    to: p.email,
    subject,
    html,
    text
  });
}

export async function enviarEmailGanadorSorteo(
  p: PayloadGanadorSorteo
): Promise<void> {
  const { subject, html, text } = renderEmailGanadorSorteo(p);
  await resend().emails.send({
    from: emailFromAddress(),
    to: p.email,
    subject,
    html,
    text
  });
}
