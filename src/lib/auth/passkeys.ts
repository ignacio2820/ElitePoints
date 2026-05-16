import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  AuthenticationResponseJSON,
  RegistrationResponseJSON
} from "@simplewebauthn/types";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { appBaseUrlForAuth } from "@/lib/auth/continueUrl";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export interface PasskeyDoc {
  uid: string;
  email: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  creadoEn: string;
  /** Perfil Firestore al que pertenece la huella (persistente tras reinstalar PWA). */
  localId?: string;
  clienteId?: string;
}

function rpId(): string {
  const fromEnv = process.env.WEBAUTHN_RP_ID?.trim();
  if (fromEnv) return fromEnv;
  try {
    return new URL(appBaseUrlForAuth()).hostname;
  } catch {
    return "localhost";
  }
}

function origin(): string {
  return appBaseUrlForAuth().replace(/\/$/, "");
}

function passkeysCol() {
  return adminDb().collection("Passkeys");
}

/** ID estable en base64url (mismo formato que envía el navegador en login). */
export function normalizarCredentialId(id: string | Uint8Array | ArrayBuffer): string {
  if (typeof id === "string") return id;
  const buf = id instanceof ArrayBuffer ? Buffer.from(id) : Buffer.from(id);
  return buf.toString("base64url");
}

export async function contarPasskeysPorEmail(email: string): Promise<number> {
  const normalized = email.trim().toLowerCase();
  const snap = await passkeysCol().where("email", "==", normalized).get();
  return snap.size;
}

export async function contarPasskeysPorUid(uid: string): Promise<number> {
  const snap = await passkeysCol().where("uid", "==", uid).get();
  return snap.size;
}

export class PasskeyFlowError extends Error {
  constructor(
    message: string,
    public readonly code: "NO_CREDENTIALS" | "WEBAUTHN_DISABLED"
  ) {
    super(message);
    this.name = "PasskeyFlowError";
  }
}

/** Reasigna todas las passkeys del email al UID actual (tras magic link / recuperación). */
export async function reasignarPasskeysAlUid(
  email: string,
  uid: string,
  perfil?: { localId: string; clienteId: string }
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const snap = await passkeysCol().where("email", "==", normalized).get();
  if (snap.empty) return;

  const batch = adminDb().batch();
  for (const doc of snap.docs) {
    const patch: Record<string, unknown> = { uid };
    if (perfil) {
      patch.localId = perfil.localId;
      patch.clienteId = perfil.clienteId;
    }
    batch.update(doc.ref, patch);
  }
  await batch.commit();
}

export async function passkeyRegistrationOptions(
  uid: string,
  email: string,
  perfil?: { localId: string; clienteId: string }
) {
  const existing = await passkeysCol().where("email", "==", email.trim().toLowerCase()).get();
  const excludeCredentials = existing.docs.map((d) => {
    const data = d.data() as PasskeyDoc;
    return {
      id: data.credentialId,
      transports: data.transports
    };
  });

  const userIdEstable = perfil?.clienteId ?? uid;

  const options = await generateRegistrationOptions({
    rpName: process.env.WEBAUTHN_RP_NAME?.trim() || "MascotPoints",
    rpID: rpId(),
    userName: email,
    userID: new TextEncoder().encode(userIdEstable),
    userDisplayName: email,
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred"
    }
  });

  await adminDb().collection("PasskeyChallenges").doc(uid).set({
    challenge: options.challenge,
    tipo: "register",
    expiraEn: Date.now() + CHALLENGE_TTL_MS
  });

  return options;
}

export async function passkeyRegistrationVerify(
  uid: string,
  email: string,
  response: RegistrationResponseJSON,
  perfil?: { localId: string; clienteId: string }
) {
  const chSnap = await adminDb().collection("PasskeyChallenges").doc(uid).get();
  const ch = chSnap.data() as { challenge?: string; expiraEn?: number } | undefined;
  if (!ch?.challenge || !ch.expiraEn || ch.expiraEn < Date.now()) {
    throw new Error("El desafío expiró. Intentá de nuevo.");
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: ch.challenge,
    expectedOrigin: origin(),
    expectedRPID: rpId()
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("No pudimos verificar la passkey.");
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;
  const credentialId = normalizarCredentialId(response.id);

  await passkeysCol().doc(credentialId).set({
    uid,
    email: email.toLowerCase(),
    credentialId,
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    transports: response.response.transports,
    creadoEn: new Date().toISOString(),
    ...(perfil ? { localId: perfil.localId, clienteId: perfil.clienteId } : {})
  } satisfies PasskeyDoc & { deviceType: string; backedUp: boolean });

  await chSnap.ref.delete();
}

export async function passkeyLoginOptions(email: string) {
  const normalized = email.trim().toLowerCase();
  const snap = await passkeysCol().where("email", "==", normalized).get();
  if (snap.empty) {
    throw new PasskeyFlowError(
      "No hay passkeys registradas para este email.",
      "NO_CREDENTIALS"
    );
  }

  const allowCredentials = snap.docs.map((d) => {
    const data = d.data() as PasskeyDoc;
    return {
      id: data.credentialId,
      transports: data.transports
    };
  });

  const options = await generateAuthenticationOptions({
    rpID: rpId(),
    allowCredentials,
    userVerification: "preferred"
  });

  await adminDb().collection("PasskeyChallenges").doc(`login:${normalized}`).set({
    challenge: options.challenge,
    tipo: "login",
    expiraEn: Date.now() + CHALLENGE_TTL_MS
  });

  return options;
}

export async function passkeyLoginVerify(
  email: string,
  response: AuthenticationResponseJSON
): Promise<{ customToken: string; uid: string }> {
  const normalized = email.trim().toLowerCase();
  const credentialId = normalizarCredentialId(response.id);
  const credSnap = await passkeysCol().doc(credentialId).get();
  if (!credSnap.exists) {
    throw new Error("Passkey no reconocida.");
  }
  const cred = credSnap.data() as PasskeyDoc;

  if (cred.email !== normalized) {
    throw new Error("Esta passkey no corresponde al email ingresado.");
  }

  const chSnap = await adminDb()
    .collection("PasskeyChallenges")
    .doc(`login:${normalized}`)
    .get();
  const ch = chSnap.data() as { challenge?: string; expiraEn?: number } | undefined;
  if (!ch?.challenge || !ch.expiraEn || ch.expiraEn < Date.now()) {
    throw new Error("El desafío expiró. Intentá de nuevo.");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: ch.challenge,
    expectedOrigin: origin(),
    expectedRPID: rpId(),
    credential: {
      id: cred.credentialId,
      publicKey: Buffer.from(cred.publicKey, "base64url"),
      counter: cred.counter,
      transports: cred.transports
    }
  });

  if (!verification.verified) {
    throw new Error("No pudimos verificar la passkey.");
  }

  const newCounter = verification.authenticationInfo.newCounter;
  await credSnap.ref.update({ counter: newCounter });
  await chSnap.ref.delete();

  const { getOrCreateUserByEmail } = await import("@/lib/auth/server");
  const { sincronizarSesionClientePorEmail } = await import(
    "@/lib/auth/persistenciaCliente"
  );

  const uid = await getOrCreateUserByEmail(normalized);
  const perfilPasskey =
    cred.localId && cred.clienteId
      ? { localId: cred.localId, clienteId: cred.clienteId }
      : undefined;

  const sincronizado = await sincronizarSesionClientePorEmail(
    uid,
    normalized,
    perfilPasskey?.localId
  );

  if (!sincronizado) {
    throw new Error(
      "No encontramos una cuenta de cliente con este email. Pedile al local que te registre o usá el link mágico."
    );
  }

  const customToken = await adminAuth().createCustomToken(uid);
  return { customToken, uid };
}

export function passkeysHabilitados(): boolean {
  return process.env.NEXT_PUBLIC_WEBAUTHN_ENABLED === "true";
}
