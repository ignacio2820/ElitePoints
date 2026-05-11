/**
 * scripts/listar-clientes.ts
 * Imprime todos los clientes de un local con id, email, código corto y saldo.
 *
 * Uso:
 *   npm run listar-clientes -- <localId>
 */
import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

import { adminDb } from "../src/lib/firebase/admin";
import { cols } from "../src/lib/firebase/collections";
import type { Cliente } from "../src/lib/huellitas/types";

async function main() {
  const localId = process.argv[2];
  if (!localId) {
    console.error("Uso: npm run listar-clientes -- <localId>");
    process.exit(1);
  }
  const db = adminDb();
  const snap = await cols.clientes(db, localId).orderBy("nombre").get();
  console.log(`\nClientes en ${localId}: ${snap.size}\n`);
  for (const d of snap.docs) {
    const c = d.data() as Partial<Cliente> & { uid?: string };
    console.log(
      `  ${d.id}  | ${c.codigoCliente ?? "—".padEnd(7)}  | ${(c.nombre ?? "").padEnd(28)} | ${c.email ?? ""} | saldo=${c.saldoHuellitas ?? 0} | uid=${c.uid ?? "—"}`
    );
  }
  try {
    await db.terminate();
  } catch {
    // ignore
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
