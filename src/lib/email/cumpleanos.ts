import { Resend } from "resend";
import { emailFromAddress } from "@/lib/email/fromAddress";
import {
  accionBonoCumpleanos,
  textoBonoCumpleanos,
  type BonoCumpleanos,
  type Mascota
} from "@/lib/huellitas/types";
import { edadMascotaAnios } from "@/lib/huellitas/engine";

let _resend: Resend | null = null;
function resend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY no configurada");
    _resend = new Resend(key);
  }
  return _resend;
}

export interface PayloadCumpleanos {
  emailCliente: string;
  nombreCliente: string;
  mascota: Mascota;
  nombreLocal: string;
  huellitasRegalo?: number;
  bonoCumpleanos?: BonoCumpleanos;
}

export function renderEmailCumpleanos(p: PayloadCumpleanos): {
  subject: string;
  html: string;
  text: string;
} {
  const edad = edadMascotaAnios(p.mascota);
  const huellitas = p.huellitasRegalo ?? 20;
  const bono = p.bonoCumpleanos ?? 2;
  const accion = accionBonoCumpleanos(bono);
  const accionMin = textoBonoCumpleanos(bono);
  const subject = `¡Feliz Cumpleaños a ${p.mascota.nombre}! 🐾`;

  const beneficioCompra = `vení al local y con cada compra que realices vas a ${accion} tus Huellitas de regalo.`;

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#FBF8F3;font-family:'Helvetica Neue',Arial,sans-serif;color:#221308;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;padding:32px 16px;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;box-shadow:0 8px 24px -8px rgba(60,40,20,0.10);overflow:hidden;">
          <tr><td style="padding:32px 40px;background:linear-gradient(135deg,#8B5E3C 0%,#E07A5F 100%);color:#FBF8F3;">
            <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;opacity:.85;">${p.nombreLocal}</div>
            <h1 style="margin:8px 0 0;font-size:28px;font-weight:600;">¡Feliz Cumpleaños a ${p.mascota.nombre}! 🐾</h1>
          </td></tr>
          <tr><td style="padding:32px 40px;">
            <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hola ${p.nombreCliente},</p>
            <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
              Hoy es el día especial de <strong>${p.mascota.nombre}</strong>
              ${edad > 0 ? ` — cumple <strong>${edad} ${edad === 1 ? "año" : "años"}</strong>` : ""}.
            </p>
            <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
              ${beneficioCompra.charAt(0).toUpperCase() + beneficioCompra.slice(1)}
            </p>
            <div style="margin:24px 0;padding:20px;border:1px dashed #C9AE8C;border-radius:16px;background:#FBF8F3;">
              <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#8B5E3C;">Regalo de cumpleaños</div>
              <div style="font-size:22px;font-weight:600;margin-top:6px;">+${huellitas} Huellitas para ${p.mascota.nombre}</div>
              <div style="font-size:14px;color:#54331A;margin-top:6px;">Ya están en tu cuenta. En el local, tus compras de hoy ${accionMin} las huellitas que acumulás.</div>
            </div>
            <p style="font-size:14px;color:#54331A;margin:0;">Con cariño, el equipo de ${p.nombreLocal}.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text =
    `¡Feliz Cumpleaños a ${p.mascota.nombre}! 🐾 Hoy es su día especial: ` +
    `${beneficioCompra}\n\n` +
    `Además te regalamos ${huellitas} Huellitas en ${p.nombreLocal}.\n`;

  return { subject, html, text };
}

export async function enviarEmailCumpleanos(p: PayloadCumpleanos): Promise<void> {
  const from = emailFromAddress();
  const { subject, html, text } = renderEmailCumpleanos(p);
  await resend().emails.send({
    from,
    to: p.emailCliente,
    subject,
    html,
    text
  });
}
