import { Timestamp } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import {
  calcularNuevaFechaVencimiento,
  db,
  esPlanValido,
  formatearFechaEsAr,
  parseFechaFirestore,
  queryParam,
  resolverRefLocal,
  respuestaHtml,
  respuestaTexto,
  verificarSecret,
  type PlanMembresia
} from "./shared";

const adminHttpSecret = defineSecret("MASCOTPOINTS_ADMIN_HTTP_SECRET");

/**
 * GET ?secret=...&local=Nombre%20exacto%20o%20slug&planExtendido=mensual|semestral|anual
 * Renueva membresía con prorrateo desde vencimiento vigente si aún no expiró.
 */
export const renovarMembresiaAdmin = onRequest(
  {
    region: "southamerica-east1",
    memory: "256MiB",
    timeoutSeconds: 60,
    maxInstances: 10,
    secrets: [adminHttpSecret]
  },
  async (req, res) => {
    if (req.method !== "GET") {
      respuestaTexto(res, 405, "Método no permitido. Usá GET desde el navegador.");
      return;
    }

    const secret = queryParam(req, "secret");
    if (!verificarSecret(secret)) {
      respuestaHtml(
        res,
        401,
        "No autorizado",
        `<h1 class="err">No autorizado</h1><p>El parámetro <strong>secret</strong> no es válido.</p>`
      );
      return;
    }

    const local = queryParam(req, "local");
    const planRaw = queryParam(req, "planExtendido")?.toLowerCase();

    if (!local) {
      respuestaHtml(
        res,
        400,
        "Parámetros incompletos",
        `<h1 class="err">Falta el local</h1><p>Indicá <strong>local</strong> con el nombre exacto o el ID del comercio.</p>`
      );
      return;
    }

    if (!planRaw || !esPlanValido(planRaw)) {
      respuestaHtml(
        res,
        400,
        "Plan inválido",
        `<h1 class="err">Plan inválido</h1><p><strong>planExtendido</strong> debe ser: mensual (+1 mes), semestral (+6 meses) o anual (+12 meses).</p>`
      );
      return;
    }

    const plan: PlanMembresia = planRaw;

    try {
      const firestore = db();
      const resuelto = await resolverRefLocal(firestore, local);

      if ("error" in resuelto) {
        if (resuelto.error === "not_found") {
          respuestaHtml(
            res,
            404,
            "Local no encontrado",
            `<h1 class="err">Local no encontrado</h1><p>No existe un comercio con nombre o ID: <strong>${escapeHtml(local)}</strong>.</p>`
          );
          return;
        }

        respuestaHtml(
          res,
          409,
          "Varios locales",
          `<h1 class="err">Nombre ambiguo</h1><p>Hay más de un local con el nombre <strong>${escapeHtml(local)}</strong>. Usá el ID (slug) del documento en Firestore.</p>`
        );
        return;
      }

      const { ref, localId, nombre } = resuelto;
      const ahora = new Date();

      const resultado = await firestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
          throw new Error("LOCAL_NOT_FOUND");
        }

        const data = snap.data() ?? {};
        const fechaActual = parseFechaFirestore(data.fechaVencimiento);
        const { fechaVencimiento, baseUsada, renovoDesdeVigente } =
          calcularNuevaFechaVencimiento(fechaActual, plan, ahora);

        const ts = Timestamp.fromDate(fechaVencimiento);

        tx.set(
          ref,
          {
            estadoMembresia: "activo",
            membresiaEstado: "activo",
            membresiaPlan: plan,
            fechaVencimiento: ts,
            actualizadoEn: Timestamp.now()
          },
          { merge: true }
        );

        return {
          localId,
          nombre,
          plan,
          fechaVencimiento,
          baseUsada,
          renovoDesdeVigente
        };
      });

      const fechaLabel = formatearFechaEsAr(resultado.fechaVencimiento);
      const planLabel =
        plan === "mensual"
          ? "1 mes"
          : plan === "semestral"
            ? "6 meses"
            : "12 meses";

      const detalleBase = resultado.renovoDesdeVigente
        ? "Se sumó el tiempo desde tu vencimiento vigente (pago adelantado)."
        : "Se sumó el tiempo desde hoy (la membresía estaba vencida o sin fecha).";

      respuestaHtml(
        res,
        200,
        "Membresía renovada",
        `<h1 class="ok">Membresía renovada</h1>
<p><strong>${escapeHtml(resultado.nombre)}</strong></p>
<p>ID: <code>${escapeHtml(resultado.localId)}</code></p>
<p>Plan aplicado: <strong>${escapeHtml(plan)}</strong> (+${planLabel})</p>
<p>Nueva fecha de vencimiento:<br /><strong>${escapeHtml(fechaLabel)}</strong></p>
<p style="font-size:.85rem;color:#2d6a4f;">${detalleBase}</p>
<p style="font-size:.85rem;color:#2d6a4f;">Estado: <strong>activo</strong></p>`
      );
    } catch (err) {
      if (err instanceof Error && err.message === "LOCAL_NOT_FOUND") {
        respuestaHtml(
          res,
          404,
          "Local no encontrado",
          `<h1 class="err">Local no encontrado</h1><p>El documento ya no existe en Firestore.</p>`
        );
        return;
      }

      console.error("renovarMembresiaAdmin:", err);
      const msg =
        err instanceof Error ? err.message : "Error interno al renovar membresía.";
      respuestaHtml(
        res,
        500,
        "Error",
        `<h1 class="err">Error</h1><p>${escapeHtml(msg)}</p>`
      );
    }
  }
);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
