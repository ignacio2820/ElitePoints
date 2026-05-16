import {
  cert,
  getApps,
  initializeApp,
  getApp,
  type App
} from "firebase-admin/app";
import { getFirebaseStorageBucket } from "@/lib/firebase/storageBucket";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _app: App | null = null;
let _db: Firestore | null = null;

function normalizePrivateKey(raw: string | undefined): string | undefined {
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

function initFromServiceAccountJson(serviceAccount: {
  project_id: string;
  client_email: string;
  private_key: string;
}): App {
  const privateKey =
    normalizePrivateKey(serviceAccount.private_key) ?? serviceAccount.private_key;

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey
    }),
    projectId: serviceAccount.project_id,
    storageBucket: getFirebaseStorageBucket()
  });
}

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApp();
    return _app;
  }

  const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  if (base64Key) {
    try {
      const serviceAccount = JSON.parse(
        Buffer.from(base64Key, "base64").toString("utf-8")
      ) as {
        project_id: string;
        client_email: string;
        private_key: string;
      };
      _app = initFromServiceAccountJson(serviceAccount);
      return _app;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "JSON de cuenta inválido";
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_BASE64 inválido: ${msg}. En Vercel pegá el JSON del service account codificado en Base64.`
      );
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin no configurado. Definí FIREBASE_SERVICE_ACCOUNT_BASE64 (recomendado en Vercel) o FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL y FIREBASE_ADMIN_PRIVATE_KEY."
    );
  }

  _app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
    storageBucket: getFirebaseStorageBucket()
  });

  return _app;
}

export function adminDb(): Firestore {
  if (_db) return _db;
  const fs = getFirestore(getAdminApp());
  try {
    fs.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Ya configurado (HMR)
  }
  _db = fs;
  return _db;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}
