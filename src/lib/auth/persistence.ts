import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  type User
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

let persistenceReady: Promise<void> | null = null;

/**
 * Fuerza IndexedDB/local (no session) para que la sesión sobreviva al cierre de PWA
 * o pestaña — crítico en iOS standalone donde las cookies httpOnly a veces se pierden.
 */
export function ensureAuthPersistence(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!persistenceReady) {
    persistenceReady = setPersistence(auth, browserLocalPersistence).catch((err) => {
      persistenceReady = null;
      throw err;
    });
  }
  return persistenceReady;
}

/** Espera a que Firebase restaure el usuario desde almacenamiento local. */
export function esperarUsuarioFirebase(timeoutMs = 8000): Promise<User | null> {
  if (typeof window === "undefined") return Promise.resolve(null);

  return ensureAuthPersistence().then(
    () =>
      new Promise((resolve) => {
        if (auth.currentUser) {
          resolve(auth.currentUser);
          return;
        }
        let done = false;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (done) return;
          if (!user) return;
          done = true;
          window.clearTimeout(timer);
          unsubscribe();
          resolve(user);
        });
        const timer = window.setTimeout(() => {
          if (done) return;
          done = true;
          unsubscribe();
          resolve(auth.currentUser);
        }, timeoutMs);
      })
  );
}
