/**
 * scripts/asignar-admin.ts
 *
 * Bootstrap del primer admin (dueño) de un local.
 *
 * Uso:
 *   npm run set-admin -- <email> <localId>
 *   # ej: npm run set-admin -- dueno@example.com mi-pet-shop
 *
 * Lo que hace:
 *  1. Busca o crea el usuario en Firebase Auth con ese email.
 *  2. Le setea custom claims { role: "admin", localId }.
 *  3. (Opcional) Verifica que el local exista en Firestore.
 *
 * Después de correr esto, el usuario puede pedir un magic link en
 * /login con su email y el sistema lo llevará al panel admin.
 *
 * NOTA: Para registros nuevos preferí el flujo /onboarding desde la web,
 * que crea el local y asigna los claims automáticamente.
 */

import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";

dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

import { adminAuth } from "../src/lib/firebase/admin";
import { adminDb } from "../src/lib/firebase/admin";
import { cols } from "../src/lib/firebase/collections";

async function main() {
  const [emailRaw, localId] = process.argv.slice(2);
  if (!emailRaw || !localId) {
    console.error(
      "Uso: npm run set-admin -- <email> <localId>\n" +
        "Ej:  npm run set-admin -- dueno@example.com mi-pet-shop"
    );
    process.exit(1);
  }
  const email = emailRaw.trim().toLowerCase();

  console.log(`→ Asignando role:admin a ${email} para local ${localId}...`);

  const localSnap = await cols.local(adminDb(), localId).get();
  if (!localSnap.exists) {
    console.warn(
      `⚠  El local "${localId}" no existe todavía en Firestore. Asignamos los claims igual,\n` +
        `   pero recordá correr "npm run seed" o crear el local manualmente.`
    );
  } else {
    const nombre = (localSnap.data() as { nombre?: string }).nombre ?? localId;
    console.log(`   Local encontrado: ${nombre}`);
  }

  const auth = adminAuth();
  let uid: string;
  try {
    const u = await auth.getUserByEmail(email);
    uid = u.uid;
    console.log(`   Usuario existente: uid=${uid}`);
  } catch {
    const u = await auth.createUser({
      email,
      emailVerified: false,
      disabled: false
    });
    uid = u.uid;
    console.log(`   Usuario creado: uid=${uid}`);
  }

  await auth.setCustomUserClaims(uid, {
    role: "admin",
    localId
  });

  console.log(`\n✅ Listo. ${email} es admin de ${localId}.`);
  console.log(`\n   Ahora podés ingresar al panel:`);
  console.log(`   1) Andá a http://localhost:3000/login`);
  console.log(`   2) Ingresá tu email (${email})`);
  console.log(`   3) El sistema detecta automáticamente que sos admin`);
  console.log(`      y te lleva al panel /admin.`);
  console.log(`      (en dev sin Resend, el link aparece directo en pantalla)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Error:", err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(1);
  });
