import {
  cert,
  getApps,
  initializeApp,
  type App
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _app: App | null = null;
let _db: Firestore | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  const existing = getApps()[0];
  if (existing) {
    _app = existing;
    return _app;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin no está configurado. Definí FIREBASE_ADMIN_* en .env.local."
    );
  }

  _app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId
  });
  return _app;
}

export function adminDb(): Firestore {
  if (_db) return _db;
  const fs = getFirestore(getAdminApp());
  // Permite escribir objetos con propiedades opcionales sin tener que
  // limpiarlas manualmente (Firestore las omite en lugar de rechazar).
  try {
    fs.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings() ya fue llamado por otra instancia (HMR) — ignoramos.
  }
  _db = fs;
  return _db;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}
