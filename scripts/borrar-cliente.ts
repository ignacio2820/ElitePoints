/**
 * scripts/borrar-cliente.ts
 *
 * Borra un cliente y TODOS sus datos asociados de forma segura:
 *   - Lotes de huellitas (sub-collection)
 *   - Mascotas (sub-collection)
 *   - Índice de código corto (/CodigosClientes/{codigoSinGuion})
 *   - Índice de código de referido (/Referidos/{codigoReferido})
 *   - El doc Cliente
 *   - Opcionalmente, el user de Firebase Auth y sus claims
 *
 * Uso:
 *   npm run borrar-cliente -- <localId> <clienteId>           # borra cliente + Auth user
 *   npm run borrar-cliente -- <localId> <clienteId> --keep-auth  # mantiene Auth
 */

import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

import { adminAuth, adminDb } from "../src/lib/firebase/admin";
import { cols } from "../src/lib/firebase/collections";
import { aDocId } from "../src/lib/huellitas/codigosClientes";
import type { Cliente } from "../src/lib/huellitas/types";

async function borrarSubcoleccion(
  parentPath: string,
  subColl: string
): Promise<number> {
  const db = adminDb();
  const ref = db.collection(`${parentPath}/${subColl}`);
  const snap = await ref.get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

async function main() {
  const [localId, clienteId, ...flags] = process.argv.slice(2);
  if (!localId || !clienteId) {
    console.error(
      "Uso: npm run borrar-cliente -- <localId> <clienteId> [--keep-auth]"
    );
    process.exit(1);
  }
  const keepAuth = flags.includes("--keep-auth");

  const db = adminDb();
  const ref = cols.cliente(db, localId, clienteId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log(`⚠ Cliente ${clienteId} no existe en ${localId}`);
    return;
  }

  const data = snap.data() as Partial<Cliente> & { uid?: string };
  console.log(
    `\n→ Borrando cliente:\n   id=${clienteId}\n   nombre=${data.nombre ?? "—"}\n   email=${data.email ?? "—"}\n   código=${data.codigoCliente ?? "—"}\n   saldo=${data.saldoHuellitas ?? 0}\n`
  );

  const parentPath = `Locales/${localId}/Clientes/${clienteId}`;

  const huellitas = await borrarSubcoleccion(parentPath, "Huellitas");
  if (huellitas > 0) console.log(`   ✓ ${huellitas} lotes de huellitas borrados`);

  const mascotas = await borrarSubcoleccion(parentPath, "Mascotas");
  if (mascotas > 0) console.log(`   ✓ ${mascotas} mascotas borradas`);

  if (data.codigoCliente) {
    const docId = aDocId(data.codigoCliente);
    await cols.codigoCliente(db, localId, docId).delete().catch(() => undefined);
    console.log(`   ✓ índice CodigosClientes/${docId} liberado`);
  }
  if (data.codigoReferido) {
    await cols
      .referido(db, localId, data.codigoReferido)
      .delete()
      .catch(() => undefined);
    console.log(`   ✓ índice Referidos/${data.codigoReferido} liberado`);
  }

  await ref.delete();
  console.log("   ✓ doc Cliente borrado");

  if (data.uid && !keepAuth) {
    try {
      // Verificamos primero que NO sea un admin para no borrar accidentalmente
      // a un dueño de local que esté reusando el mismo email/UID.
      const auth = adminAuth();
      const u = await auth.getUser(data.uid);
      if ((u.customClaims ?? {}).role === "admin") {
        console.log(
          `   ⚠ El UID ${data.uid} es ADMIN. NO borro de Firebase Auth (uso --keep-auth implícito).`
        );
      } else {
        await auth.deleteUser(data.uid);
        console.log(`   ✓ user de Firebase Auth borrado (uid=${data.uid})`);
      }
    } catch (e) {
      console.log(
        `   ⚠ No pude borrar Firebase Auth user: ${e instanceof Error ? e.message : e}`
      );
    }
  } else if (keepAuth) {
    console.log(`   • --keep-auth: NO toco Firebase Auth (uid=${data.uid ?? "—"})`);
  }

  console.log("\n✅ Listo.\n");
}

main()
  .then(async () => {
    try {
      await adminDb().terminate();
    } catch {
      // ignore
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌", err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(1);
  });
