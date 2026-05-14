import {
  cert,
  getApps,
  initializeApp,
  getApp,
  type App
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _app: App | null = null;
let _db: Firestore | null = null;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (base64Key) {
    try {
      // Decodificamos el JSON completo para evitar errores de caracteres o saltos de línea
      const serviceAccount = JSON.parse(
        Buffer.from(base64Key, "base64").toString("utf-8")
      );
      
      _app = initializeApp({
        credential: cert(serviceAccount),
        // La URL se saca directamente del JSON decodificado
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      });
      
      console.log("Firebase Admin inicializado con éxito vía Base64");
      return _app;
    } catch (error) {
      console.error("Error decodificando la clave Base64:", error);
      throw error;
    }
  }

  // Fallback por si la variable Base64 no está (mantiene compatibilidad temporal)
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Falta la configuración de Firebase Admin (Base64 o Variables individuales).");
  }

  _app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
    databaseURL: `https://${projectId}.firebaseio.com`,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  });

  return _app;
}

export function adminDb(): Firestore {
  if (_db) return _db;
  const app = getAdminApp();
  const fs = getFirestore(app);
  
  try {
    fs.settings({ ignoreUndefinedProperties: true });
  } catch (e) {
    // Ignorar si ya está inicializado
  }
  
  _db = fs;
  return _db;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}