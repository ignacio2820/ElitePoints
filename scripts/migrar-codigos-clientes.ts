/**
 * scripts/migrar-codigos-clientes.ts
 *
 * Asigna un `codigoCliente` corto (ej "ABC-123") a todos los clientes
 * existentes que aún no lo tienen. Idempotente: corre cuantas veces quieras.
 *
 * Uso:
 *   npm run migrar-codigos -- <localId>
 *   npm run migrar-codigos -- --all   # recorre todos los locales
 */

import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

import { adminDb } from "../src/lib/firebase/admin";
import { cols } from "../src/lib/firebase/collections";
import { asegurarCodigoClienteUnico } from "../src/lib/huellitas/codigosClientesService";
import type { Cliente } from "../src/lib/huellitas/types";

async function migrarLocal(localId: string): Promise<{ procesados: number; nuevos: number }> {
  const db = adminDb();
  const snap = await cols.clientes(db, localId).get();
  let nuevos = 0;
  for (const docu of snap.docs) {
    const data = docu.data() as Partial<Cliente>;
    if (data.codigoCliente) continue;
    const codigo = await asegurarCodigoClienteUnico(localId, docu.id);
    await docu.ref.update({ codigoCliente: codigo });
    nuevos++;
    console.log(`   • ${data.nombre ?? docu.id} → ${codigo}`);
  }
  return { procesados: snap.size, nuevos };
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Uso: npm run migrar-codigos -- <localId>  |  --all");
    process.exit(1);
  }

  if (arg === "--all") {
    const locales = await adminDb().collection("Locales").listDocuments();
    for (const ref of locales) {
      console.log(`\n→ Migrando local: ${ref.id}`);
      const r = await migrarLocal(ref.id);
      console.log(
        `   ✓ ${ref.id}: ${r.procesados} clientes (${r.nuevos} con código nuevo)`
      );
    }
  } else {
    console.log(`\n→ Migrando local: ${arg}`);
    const r = await migrarLocal(arg);
    console.log(
      `   ✓ ${arg}: ${r.procesados} clientes (${r.nuevos} con código nuevo)`
    );
  }

  try {
    await adminDb().terminate();
  } catch {
    // ignore
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌", err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(1);
  });
