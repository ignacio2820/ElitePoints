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

/**
 * Email de bienvenida para un dueño que acaba de crear su Pet Shop.
 *
 * Más rico que el magic link genérico:
 *  - Saluda al dueño y celebra el hito.
 *  - Incluye el magic link para entrar al panel.
 *  - Lista 4 tips concretos de qué hacer en los primeros 5 minutos.
 *  - Comparte enlaces a la documentación / soporte.
 */

export interface PayloadBienvenida {
  to: string;
  magicLink: string;
  nombreLocal: string;
  /** Slug del local (para mostrar la URL futura del cliente) */
  slugLocal: string;
  /** Base URL pública (ej: https://huellitas.app) */
  baseUrl: string;
}

export function renderEmailBienvenidaPetShop(p: PayloadBienvenida): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `¡Bienvenido a Huellitas! ${p.nombreLocal} ya está activo`;

  const tipsTexto = [
    "1. Configurá el costo de tu programa: andá a Configuración y ajustá cuánto vale 1 Huellita.",
    "2. Cargá tus primeros premios: ya te dejamos 3 de muestra (los podés editar o reemplazar).",
    "3. Personalizá tus niveles de fidelidad: definí beneficios y multiplicadores.",
    "4. Registrá tu primera venta desde el panel para ver el flujo completo."
  ];

  const tipsHtml = `
    <ol style="margin:0;padding-left:20px;color:#54331A;font-size:14px;line-height:1.8;">
      <li style="margin-bottom:6px;"><strong>Configurá el costo de tu programa.</strong> Andá a Configuración y ajustá cuánto vale 1 Huellita. Por defecto dejamos 1% de costo (saludable).</li>
      <li style="margin-bottom:6px;"><strong>Revisá tus 3 premios de muestra.</strong> Los podés editar, agregar fotos o reemplazar por los tuyos en Configuración → Premios.</li>
      <li style="margin-bottom:6px;"><strong>Personalizá tus niveles.</strong> Cachorro / Explorador / Gran Guardián vienen prearmados; ajustá multiplicadores y beneficios.</li>
      <li style="margin-bottom:6px;"><strong>Registrá tu primera venta.</strong> Andá a Caja, ingresá el código del cliente y mirá cómo se acreditan las Huellitas.</li>
    </ol>
  `;

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#FBF8F3;font-family:'Helvetica Neue',Arial,sans-serif;color:#221308;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;padding:32px 16px;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;box-shadow:0 8px 24px -8px rgba(60,40,20,0.10);overflow:hidden;">

          <!-- Header dorado premium -->
          <tr><td style="padding:36px 40px;background:linear-gradient(135deg,#0F0F0F 0%,#2A1F0F 50%,#3D2C13 100%);color:#FBF8F3;">
            <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#F0C674;font-weight:600;">Onboarding · Huellitas</div>
            <h1 style="margin:10px 0 0;font-size:30px;font-weight:600;line-height:1.2;color:#FCD181;">¡Bienvenido!</h1>
            <p style="margin:8px 0 0;font-size:16px;color:#FBF8F3;opacity:0.9;">${p.nombreLocal} ya está activo en Huellitas.</p>
          </td></tr>

          <!-- Cuerpo -->
          <tr><td style="padding:36px 40px;">
            <p style="font-size:16px;line-height:1.6;margin:0 0 20px;color:#221308;">
              Tu Pet Shop ya tiene su programa de fidelidad listo. Configuramos
              todo con valores saludables (1% de costo, niveles default y 3 premios
              de muestra) para que arranques sin fricciones.
            </p>

            <div style="text-align:center;margin:28px 0;">
              <a href="${p.magicLink}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#F0C674 0%,#D4A04C 100%);color:#1A0F00;text-decoration:none;border-radius:14px;font-weight:700;font-size:16px;box-shadow:0 8px 20px -6px rgba(212,160,76,0.5);">
                Entrar al panel →
              </a>
            </div>

            <p style="font-size:13px;color:#9F8B7A;margin:16px 0 0;text-align:center;">
              Sin contraseñas. El link expira en 1 hora y solo se puede usar una vez.
            </p>

            <!-- Separador -->
            <hr style="border:none;border-top:1px dashed #E5D8C7;margin:36px 0;">

            <h2 style="font-size:18px;font-weight:600;color:#54331A;margin:0 0 16px;">
              Primeros 5 minutos: qué hacer
            </h2>
            ${tipsHtml}

            <!-- Bloque info clave -->
            <div style="margin-top:32px;padding:20px;background:#FBF6EE;border-left:4px solid #D4A04C;border-radius:8px;">
              <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8B6914;font-weight:700;">Identificador de tu local</div>
              <code style="display:block;margin-top:6px;font-size:15px;color:#54331A;font-weight:600;">${p.slugLocal}</code>
              <p style="font-size:13px;color:#54331A;margin:10px 0 0;line-height:1.5;">
                Tus clientes acceden a su panel desde
                <a href="${p.baseUrl}/login" style="color:#8B6914;font-weight:600;">${p.baseUrl.replace(/^https?:\/\//, "")}/login</a>.
                Cada uno verá el nombre y los premios de tu local.
              </p>
            </div>

            <p style="font-size:13px;color:#54331A;line-height:1.5;margin:28px 0 0;">
              ¿Tenés dudas o querés que ajustemos algo? Respondé este email o escribinos a
              <a href="mailto:hola@huellitas.app" style="color:#8B6914;font-weight:600;">hola@huellitas.app</a>.
            </p>
          </td></tr>

          <!-- Footer -->
          <tr><td style="padding:20px 40px;background:#FBF6EE;text-align:center;">
            <p style="font-size:11px;color:#9F8B7A;margin:0;line-height:1.6;">
              Recibiste este email porque registraste un Pet Shop en Huellitas.<br>
              Si no fuiste vos, podés ignorarlo: la cuenta no se activa hasta que entres al panel.
            </p>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `¡Bienvenido a Huellitas!\n\n${p.nombreLocal} ya está activo.\n\nEntrá al panel:\n${p.magicLink}\n\nPrimeros 5 minutos:\n${tipsTexto.join("\n")}\n\nIdentificador de tu local: ${p.slugLocal}\nTus clientes acceden desde: ${p.baseUrl}/login\n\nSoporte: hola@huellitas.app\n\nSin contraseñas. El link expira en 1 hora y solo puede usarse una vez.\n`;

  return { subject, html, text };
}

export async function enviarEmailBienvenidaPetShop(
  p: PayloadBienvenida
): Promise<void> {
  const from = process.env.RESEND_FROM ?? "Huellitas <hola@huellitas.app>";
  const { subject, html, text } = renderEmailBienvenidaPetShop(p);
  await resend().emails.send({
    from,
    to: p.to,
    subject,
    html,
    text
  });
}
