/**
 * scripts/seed.ts
 *
 * Inicializa un Pet Shop de demo en Firestore con configuración saludable
 * (1% de costo), niveles default (Cachorro / Explorador / Gran Guardián)
 * y 3 premios de muestra.
 *
 * IMPORTANTE: este script es un atajo para desarrollo. En producción el
 * flujo recomendado es /onboarding (mismo resultado, pero con creación
 * de admin user en Firebase Auth y email de bienvenida).
 *
 * Idempotente: usa `merge: true` en los sets, así reusarlo no pisa
 * campos ya existentes (ej. cuando ya hay clientes / ventas reales).
 *
 * Ejecución:
 *   npm run seed                                       # crea "demo-pet-shop"
 *   npm run seed -- --id=mi-tienda --nombre="Mi Tienda"
 */

import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";

dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

import { Timestamp } from "firebase-admin/firestore";

import { adminDb } from "../src/lib/firebase/admin";
import { cols } from "../src/lib/firebase/collections";
import {
  CONFIGURACION_DEFAULT,
  ConfiguracionLocalSchema,
  NIVELES_DEFAULT,
  PremioSchema,
  type ConfiguracionLocal,
  type Premio
} from "../src/lib/huellitas/types";
import { esSlugValido, nombreASlug } from "../src/lib/huellitas/slug";

interface SeedArgs {
  localId: string;
  nombreLocal: string;
}

function configFor(localId: string): ConfiguracionLocal {
  return {
    ...CONFIGURACION_DEFAULT,
    localId,
    referidos: {
      ...CONFIGURACION_DEFAULT.referidos,
      bonusBienvenida: 30,
      bonusReferente: 50
    },
    niveles: NIVELES_DEFAULT
  };
}

function premiosFor(localId: string): Premio[] {
  return [
    {
      localId,
      nombre: "Beneficio de bienvenida",
      descripcion: "Premio de entrada para nuevos clientes.",
      costoHuellitas: 50,
      nivelMinimoId: "bronce",
      categoria: "otro",
      stock: null,
      activo: true
    },
    {
      localId,
      nombre: "Descuento intermedio",
      descripcion: "Para clientes nivel Plata.",
      costoHuellitas: 200,
      nivelMinimoId: "plata",
      categoria: "otro",
      stock: null,
      activo: true
    },
    {
      localId,
      nombre: "Experiencia premium",
      descripcion: "Beneficio reservado a clientes Elite.",
      costoHuellitas: 800,
      nivelMinimoId: "elite",
      categoria: "servicio",
      stock: null,
      activo: true
    }
  ];
}

function parseArgs(): SeedArgs {
  let id: string | undefined;
  let nombre: string | undefined;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--id=")) id = arg.slice("--id=".length);
    else if (arg.startsWith("--nombre=")) nombre = arg.slice("--nombre=".length);
  }
  const nombreFinal = (nombre ?? "Pet Shop Demo").trim();
  const idFinal = id ? id.trim() : nombreASlug(nombreFinal) || "demo-pet-shop";
  if (!esSlugValido(idFinal)) {
    throw new Error(
      `localId inválido: "${idFinal}". Usá solo letras, números y guiones (ej: "mi-pet-shop").`
    );
  }
  return { localId: idFinal, nombreLocal: nombreFinal };
}

function assertEnv(): void {
  const missing = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY"
  ].filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Faltan variables en .env.local: ${missing.join(", ")}. ` +
        "Completá las credenciales de la Service Account antes de correr el seed."
    );
  }
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes("PEGA_TU_PRIVATE_KEY")) {
    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY tiene el placeholder. " +
        "Pegá tu private key real (entre comillas, con \\n literales) en .env.local."
    );
  }
}

async function main(): Promise<void> {
  console.log("→ Validando entorno...");
  assertEnv();

  const { localId, nombreLocal } = parseArgs();

  const cfg = configFor(localId);
  const premios = premiosFor(localId);

  console.log("→ Validando esquema (Zod)...");
  ConfiguracionLocalSchema.parse(cfg);
  premios.forEach((p) => PremioSchema.parse(p));

  console.log(`→ Inicializando Firestore Admin SDK...`);
  const db = adminDb();
  const ahora = Timestamp.now();

  console.log(`→ Sembrando /Locales/${localId}...`);
  await cols.local(db, localId).set(
    {
      nombre: nombreLocal,
      slug: localId,
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora
    },
    { merge: true }
  );

  console.log(`→ Sembrando /Locales/${localId}/ConfiguracionLocal/main...`);
  await cols.configuracion(db, localId).set(
    {
      ...cfg,
      actualizadoEn: ahora,
      actualizadoPor: "seed-script"
    },
    { merge: true }
  );

  console.log(`→ Sembrando premios de prueba...`);
  for (const premio of premios) {
    const ref = cols.premios(db, localId);
    const existing = await ref.where("nombre", "==", premio.nombre).limit(1).get();
    if (existing.empty) {
      const created = await ref.add({
        ...premio,
        creadoEn: ahora,
        actualizadoEn: ahora
      });
      console.log(`   + Creado "${premio.nombre}" (id=${created.id})`);
    } else {
      const doc = existing.docs[0];
      await doc.ref.set({ ...premio, actualizadoEn: ahora }, { merge: true });
      console.log(`   ↻ Actualizado "${premio.nombre}" (id=${doc.id})`);
    }
  }

  console.log("\n✅ Seed completado.");
  console.log(`   Local:          ${nombreLocal} (${localId})`);
  console.log(
    `   Regla:          1 Huellita = $${cfg.montoParaUnaHuellita}  |  Canje: $${cfg.valorMonetarioHuellita}/Huellita  (1% de costo)`
  );
  console.log(
    `   Niveles:        ${NIVELES_DEFAULT.map((n) => n.nombre).join(" → ")}`
  );
  console.log(`   Premios:        ${premios.map((p) => p.nombre).join(", ")}`);
  console.log(
    `\n   Verificá en: https://console.firebase.google.com/project/${process.env.FIREBASE_ADMIN_PROJECT_ID}/firestore/data/~2FLocales~2F${localId}`
  );
  console.log(
    `\n   Para asignar admin a un email:`
  );
  console.log(`   npm run set-admin -- <email> ${localId}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Seed falló:", err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  });
