/**
 * scripts/check-admin.ts
 *
 * Diagnóstico rápido: imprime el estado de uno o más emails en Firebase Auth
 * y en Firestore (cliente vinculado). Útil para depurar problemas de acceso.
 *
 * Uso:
 *   npm run check-user -- <email1> [<email2> ...]
 */

import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

import { adminAuth, adminDb } from "../src/lib/firebase/admin";
import { buscarClientePorEmailGlobal } from "../src/lib/huellitas/clientesService";

async function main() {
  const emails = process.argv.slice(2);
  if (emails.length === 0) {
    console.error("Uso: npm run check-user -- <email1> [<email2> ...]");
    process.exit(1);
  }
  const auth = adminAuth();
  for (const emailRaw of emails) {
    const email = emailRaw.trim().toLowerCase();
    console.log(`\n=== ${email} ===`);
    let authUid: string | null = null;
    try {
      const u = await auth.getUserByEmail(email);
      authUid = u.uid;
      console.log("  AUTH uid:", u.uid);
      console.log("  AUTH disabled:", u.disabled);
      console.log("  AUTH emailVerified:", u.emailVerified);
      console.log("  AUTH customClaims:", JSON.stringify(u.customClaims ?? null));
      console.log(
        "  AUTH providers:",
        u.providerData.map((p) => p.providerId).join(", ") || "(ninguno)"
      );
    } catch {
      console.log("  AUTH: ❌ no existe en Firebase Auth");
    }

    try {
      const cli = await buscarClientePorEmailGlobal(email);
      if (cli) {
        console.log(`  CLIENT: ✓ id=${cli.id} local=${cli.localId} nombre=${cli.nombre}`);
        if (cli.uid && authUid && cli.uid !== authUid) {
          console.log(
            `  ⚠ MISMATCH: cliente.uid=${cli.uid} pero auth.uid=${authUid}`
          );
        }
      } else {
        console.log("  CLIENT: — no hay doc Cliente con ese email");
      }
    } catch (e) {
      console.log(
        "  CLIENT: ⚠ error buscando:",
        e instanceof Error ? e.message : e
      );
    }
  }
  // cerrar pool firestore
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
