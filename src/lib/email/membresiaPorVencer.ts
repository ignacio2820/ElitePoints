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

export interface PayloadMembresiaPorVencer {
  to: string;
  nombreLocal: string;
  diasRestantes: number;
  fechaVencimiento: string;
  renovarUrl: string;
}

export function renderEmailMembresiaPorVencer(p: PayloadMembresiaPorVencer): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Tu membresía de ${p.nombreLocal} vence en ${p.diasRestantes} día${
    p.diasRestantes === 1 ? "" : "s"
  }`;
  const text = [
    `Hola,`,
    ``,
    `La membresía de ${p.nombreLocal} vence el ${p.fechaVencimiento} (${p.diasRestantes} día${
      p.diasRestantes === 1 ? "" : "s"
    } restantes).`,
    `Renová desde el panel para seguir usando Caja y Clientes sin interrupciones.`,
    ``,
    p.renovarUrl
  ].join("\n");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#221308;max-width:560px">
      <p>Tu membresía de <strong>${p.nombreLocal}</strong> vence el <strong>${p.fechaVencimiento}</strong>.</p>
      <p>Quedan <strong>${p.diasRestantes}</strong> día${
        p.diasRestantes === 1 ? "" : "s"
      }. Renová ahora para no perder acceso a Caja y Clientes.</p>
      <p><a href="${p.renovarUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#6F4626;color:#FBF8F3;text-decoration:none;font-weight:600">Renovar membresía</a></p>
    </div>
  `;

  return { subject, html, text };
}

export async function enviarEmailMembresiaPorVencer(
  payload: PayloadMembresiaPorVencer
): Promise<void> {
  const from = process.env.RESEND_FROM ?? "Huellitas <onboarding@resend.dev>";
  const { subject, html, text } = renderEmailMembresiaPorVencer(payload);
  await resend().emails.send({
    from,
    to: payload.to,
    subject,
    html,
    text
  });
}
