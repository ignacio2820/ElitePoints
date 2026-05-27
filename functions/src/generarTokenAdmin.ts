import { Timestamp } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import {
  COLECCION_ACTIVATION_TOKENS,
  DIAS_VALIDEZ_TOKEN,
  db,
  esPlanValido,
  generarIdToken,
  queryParam,
  respuestaTexto,
  urlOnboarding,
  verificarSecret
} from "./shared";

const adminHttpSecret = defineSecret("MASCOTPOINTS_ADMIN_HTTP_SECRET");

/**
 * GET ?secret=...&local=Nombre%20Comercio&plan=mensual|semestral|anual
 * Respuesta: URL de onboarding en texto plano (copiar/pegar en el celular).
 */
export const generarTokenAdmin = onRequest(
  {
    region: "southamerica-east1",
    memory: "256MiB",
    timeoutSeconds: 30,
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
      respuestaTexto(res, 401, "No autorizado. El parámetro secret no es válido.");
      return;
    }

    const local = queryParam(req, "local");
    const planRaw = queryParam(req, "plan")?.toLowerCase();

    if (!local) {
      respuestaTexto(res, 400, "Falta el parámetro local (nombre del comercio).");
      return;
    }

    if (!planRaw || !esPlanValido(planRaw)) {
      respuestaTexto(
        res,
        400,
        "El parámetro plan debe ser: mensual, semestral o anual."
      );
      return;
    }

    try {
      const token = generarIdToken();
      const ahora = new Date();
      const expira = new Date(ahora);
      expira.setDate(expira.getDate() + DIAS_VALIDEZ_TOKEN);

      const firestore = db();
      const doc = {
        token,
        name: local,
        plan: planRaw,
        used: false,
        createdAt: Timestamp.fromDate(ahora),
        expiresAt: Timestamp.fromDate(expira)
      };

      await firestore
        .collection(COLECCION_ACTIVATION_TOKENS)
        .doc(token)
        .set(doc);

      respuestaTexto(res, 200, urlOnboarding(token));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error interno al crear el token.";
      console.error("generarTokenAdmin:", err);
      respuestaTexto(res, 500, msg);
    }
  }
);
