/**
 * Purga datos operativos de Firestore dejando configuración básica del local.
 *
 * Por cada local en /Locales:
 *   - Borra: Clientes (+ subcolecciones), Ventas, Canjes, CanjesPendientes,
 *     Premios, Referidos, EventosReferido, CodigosClientes, logs_canjes,
 *     NotificacionesCanje
 *   - Conserva: documento del local y ConfiguracionLocal/main
 *
 * Uso:
 *   npm run purgar-firestore -- --confirm
 *   npm run purgar-firestore -- --localId=mi-tienda --confirm
 */

import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
import readline from "node:readline";

dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

import { adminDb } from "../src/lib/firebase/admin";

const SUBCOLECCIONES_A_PURGAR = [
  "Clientes",
  "Ventas",
  "Canjes",
  "CanjesPendientes",
  "Premios",
  "Referidos",
  "EventosReferido",
  "CodigosClientes",
  "logs_canjes",
  "NotificacionesCanje"
] as const;

async function borrarColeccion(path: string): Promise<number> {
  const db = adminDb();
  const col = db.collection(path);
  let total = 0;

  while (true) {
    const snap = await col.limit(400).get();
    if (snap.empty) break;

    const batch = db.batch();
    for (const doc of snap.docs) {
      const subcols = await doc.ref.listCollections();
      for (const sub of subcols) {
        total += await borrarColeccion(sub.path);
      }
      batch.delete(doc.ref);
      total += 1;
    }
    await batch.commit();
  }

  return total;
}

function parseArgs(): { localId?: string; confirm: boolean } {
  const args = process.argv.slice(2);
  let localId: string | undefined;
  let confirm = false;
  for (const a of args) {
    if (a === "--confirm") confirm = true;
    else if (a.startsWith("--localId=")) localId = a.split("=")[1];
  }
  return { localId, confirm };
}

async function pedirConfirmacion(pregunta: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(pregunta, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "si");
    });
  });
}

async function purgarLocal(localId: string): Promise<number> {
  let eliminados = 0;
  for (const nombre of SUBCOLECCIONES_A_PURGAR) {
    const n = await borrarColeccion(`Locales/${localId}/${nombre}`);
    if (n > 0) {
      console.log(`  ${nombre}: ${n} documentos`);
    }
    eliminados += n;
  }
  return eliminados;
}

async function main() {
  const { localId, confirm } = parseArgs();
  const db = adminDb();

  if (!confirm) {
    console.error(
      "⚠️  Esto borra clientes, ventas, premios y canjes. Ejecutá con --confirm"
    );
    process.exit(1);
  }

  const ok = await pedirConfirmacion(
    'Escribí "si" para confirmar la purga irreversible: '
  );
  if (!ok) {
    console.log("Cancelado.");
    process.exit(0);
  }

  const localesSnap = localId
    ? await db.collection("Locales").doc(localId).get().then((d) =>
        d.exists ? { docs: [d] } : { docs: [] as typeof d[] }
      )
    : await db.collection("Locales").get();

  if (localesSnap.docs.length === 0) {
    console.log("No hay locales para purgar.");
    return;
  }

  let total = 0;
  for (const doc of localesSnap.docs) {
    console.log(`\nPurgando local: ${doc.id}`);
    total += await purgarLocal(doc.id);
  }

  console.log(`\n✓ Purga completada. ${total} documentos eliminados.`);
  console.log("  Se conservó ConfiguracionLocal/main y metadatos del local.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
