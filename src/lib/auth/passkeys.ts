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

export async function passkeyRegistrationOptions(uid: string, email: string) {
  const existing = await passkeysCol().where("uid", "==", uid).get();
  const excludeCredentials = existing.docs.map((d) => {
    const data = d.data() as PasskeyDoc;
    return {
      id: data.credentialId,
      transports: data.transports
    };
  });

  const options = await generateRegistrationOptions({
    rpName: process.env.WEBAUTHN_RP_NAME?.trim() || "MascotPoints",
    rpID: rpId(),
    userName: email,
    userID: new TextEncoder().encode(uid),
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
  response: RegistrationResponseJSON
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
  const credentialId = Buffer.from(credential.id).toString("base64url");

  await passkeysCol().doc(credentialId).set({
    uid,
    email: email.toLowerCase(),
    credentialId,
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    transports: response.response.transports,
    creadoEn: new Date().toISOString()
  } satisfies PasskeyDoc & { deviceType: string; backedUp: boolean });

  await chSnap.ref.delete();
}

export async function passkeyLoginOptions(email: string) {
  const normalized = email.trim().toLowerCase();
  const snap = await passkeysCol().where("email", "==", normalized).get();
  if (snap.empty) {
    throw new Error("No hay passkeys registradas para este email.");
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
  const credentialId = response.id;
  const credSnap = await passkeysCol().doc(credentialId).get();
  if (!credSnap.exists) {
    throw new Error("Passkey no reconocida.");
  }
  const cred = credSnap.data() as PasskeyDoc;

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

  const customToken = await adminAuth().createCustomToken(cred.uid);
  return { customToken, uid: cred.uid };
}

export function passkeysHabilitados(): boolean {
  return process.env.NEXT_PUBLIC_WEBAUTHN_ENABLED === "true";
}
