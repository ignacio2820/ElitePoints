import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Inicialización del Firebase Web SDK (lado cliente).
 *
 * Patrón canónico Next.js / React:
 *  - Inicializamos UNA sola vez aunque el módulo se evalúe múltiples veces
 *    (HMR en dev, cold start de funciones, etc.).
 *  - getApps().length > 0 ? getApp() : initializeApp(...) previene el
 *    error "Firebase App named '[DEFAULT]' already exists".
 *  - `db` y `auth` se exportan como instancias listas para usar.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

/** True si las credenciales NEXT_PUBLIC_FIREBASE_* están definidas. */
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export default app;
