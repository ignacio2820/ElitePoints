#!/usr/bin/env node
/**
 * Genera un token de activación de un solo uso para onboarding de un comercio nuevo.
 *
 * Uso:
 *   npm run generar-token -- "Veterinaria Elite" mensual
 *   npm run generar-token -- --nombre="Mi Pet Shop" --plan=anual
 *
 * Requiere .env.local con credenciales Firebase Admin (igual que el resto de scripts).
 */

const { config: dotenvConfig } = require("dotenv");
const { resolve } = require("node:path");
const { randomUUID } = require("node:crypto");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

const PLANES_VALIDOS = new Set(["mensual", "semestral", "anual"]);
const ONBOARDING_BASE_URL =
  process.env.ONBOARDING_BASE_URL?.trim() ||
  "https://mascotpoints.webelitesolution.io/onboarding";
const DIAS_VALIDEZ = 7;

function normalizePrivateKey(raw) {
  if (raw == null) return undefined;
  let key = String(raw).trim();
  if (!key) return undefined;
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/\\r\\n/g, "\n").replace(/\\r/g, "\n");
  key = key.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");
  return key.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim() || undefined;
}

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  if (base64Key) {
    const serviceAccount = JSON.parse(
      Buffer.from(base64Key, "base64").toString("utf-8")
    );
    const privateKey =
      normalizePrivateKey(serviceAccount.private_key) ??
      serviceAccount.private_key;
    return initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey
      }),
      projectId: serviceAccount.project_id
    });
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin no configurado. Definí FIREBASE_SERVICE_ACCOUNT_BASE64 o " +
        "FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL y FIREBASE_ADMIN_PRIVATE_KEY en .env.local"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId
  });
}

function printHelp() {
  console.log(`
Uso:
  npm run generar-token -- "<nombre del local>" <plan>
  npm run generar-token -- --nombre="<nombre>" --plan=<mensual|semestral|anual>

Planes válidos: mensual, semestral, anual

Ejemplo:
  npm run generar-token -- "Veterinaria Elite" mensual
`);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  let nombre = null;
  let plan = null;
  const positional = [];

  for (const arg of argv) {
    if (arg.startsWith("--nombre=")) {
      nombre = arg.slice("--nombre=".length).trim();
    } else if (arg.startsWith("--plan=")) {
      plan = arg.slice("--plan=".length).trim().toLowerCase();
    } else if (arg.startsWith("-")) {
      console.error(`Opción desconocida: ${arg}`);
      printHelp();
      process.exit(1);
    } else {
      positional.push(arg);
    }
  }

  if (!nombre && positional[0]) nombre = positional[0].trim();
  if (!plan && positional[1]) plan = positional[1].trim().toLowerCase();

  return { nombre, plan };
}

function validarEntrada(nombre, plan) {
  if (!nombre) {
    console.error("Error: falta el nombre del local.\n");
    printHelp();
    process.exit(1);
  }
  if (!plan || !PLANES_VALIDOS.has(plan)) {
    console.error(
      `Error: el plan debe ser uno de: ${[...PLANES_VALIDOS].join(", ")}.\n`
    );
    printHelp();
    process.exit(1);
  }
}

async function main() {
  const { nombre, plan } = parseArgs(process.argv.slice(2));
  validarEntrada(nombre, plan);

  const token = randomUUID();
  const ahora = new Date();
  const expira = new Date(ahora);
  expira.setDate(expira.getDate() + DIAS_VALIDEZ);

  initFirebaseAdmin();
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });

  const doc = {
    token,
    name: nombre,
    plan,
    used: false,
    createdAt: Timestamp.fromDate(ahora),
    expiresAt: Timestamp.fromDate(expira)
  };

  await db.collection("activation_tokens").doc(token).set(doc);

  const base = ONBOARDING_BASE_URL.replace(/\/$/, "");
  const url = `${base}?token=${encodeURIComponent(token)}`;

  console.log("\n✅ Token de activación creado\n");
  console.log(`   Local:   ${nombre}`);
  console.log(`   Plan:    ${plan}`);
  console.log(`   Token:   ${token}`);
  console.log(`   Vence:   ${expira.toLocaleString("es-AR")} (7 días)\n`);
  console.log("Copiá y enviá este link al comercio:\n");
  console.log(url);
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ Error:", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});
