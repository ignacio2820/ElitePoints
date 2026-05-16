import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { buscarClientePorEmailRobusto } from "@/lib/auth/persistenciaCliente";

export type OwnerIndex = {
  email: string;
  localId: string;
  uid?: string;
};

export type CustomerIndex = {
  email: string;
  localId: string;
  clienteId: string;
  uid?: string;
};

export type IdentidadResuelta =
  | { tipo: "owner"; localId: string; uid?: string }
  | { tipo: "customer"; localId: string; clienteId: string; uid?: string };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function ownersCol() {
  return adminDb().collection("owners");
}

function customersCol() {
  return adminDb().collection("customers");
}

export async function upsertOwnerIndex(input: {
  email: string;
  localId: string;
  uid?: string;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  await ownersCol()
    .doc(email)
    .set(
      {
        email,
        localId: input.localId,
        uid: input.uid ?? null,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
}

export async function upsertCustomerIndex(input: {
  email: string;
  localId: string;
  clienteId: string;
  uid?: string;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  await customersCol()
    .doc(email)
    .set(
      {
        email,
        localId: input.localId,
        clienteId: input.clienteId,
        uid: input.uid ?? null,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
}

export async function buscarOwnerPorEmail(
  email: string
): Promise<OwnerIndex | null> {
  const snap = await ownersCol().doc(normalizeEmail(email)).get();
  if (!snap.exists) return null;
  const d = snap.data() as Partial<OwnerIndex>;
  if (!d?.localId) return null;
  return {
    email: d.email ?? normalizeEmail(email),
    localId: d.localId,
    uid: d.uid
  };
}

export async function buscarCustomerPorEmail(
  email: string
): Promise<CustomerIndex | null> {
  const snap = await customersCol().doc(normalizeEmail(email)).get();
  if (!snap.exists) return null;
  const d = snap.data() as Partial<CustomerIndex>;
  if (!d?.localId || !d?.clienteId) return null;
  return {
    email: d.email ?? normalizeEmail(email),
    localId: d.localId,
    clienteId: d.clienteId,
    uid: d.uid
  };
}

/**
 * Busca el email en `owners` y `customers`, con respaldo en Auth claims y
 * Clientes legacy. Prioridad: owner → customer.
 */
export async function buscarIdentidadPorEmail(
  email: string
): Promise<IdentidadResuelta | null> {
  const normalized = normalizeEmail(email);

  const owner = await buscarOwnerPorEmail(normalized);
  if (owner) {
    return { tipo: "owner", localId: owner.localId, uid: owner.uid };
  }

  const customer = await buscarCustomerPorEmail(normalized);
  if (customer) {
    return {
      tipo: "customer",
      localId: customer.localId,
      clienteId: customer.clienteId,
      uid: customer.uid
    };
  }

  const auth = adminAuth();
  try {
    const u = await auth.getUserByEmail(normalized);
    const claims = u.customClaims ?? {};
    if (claims.role === "admin" && typeof claims.localId === "string") {
      await upsertOwnerIndex({
        email: normalized,
        localId: claims.localId,
        uid: u.uid
      });
      return { tipo: "owner", localId: claims.localId, uid: u.uid };
    }
  } catch {
    // no existe en Auth
  }

  const cli = await buscarClientePorEmailRobusto(normalized);
  if (cli) {
    await upsertCustomerIndex({
      email: normalized,
      localId: cli.localId,
      clienteId: cli.id,
      uid: cli.uid
    });
    return {
      tipo: "customer",
      localId: cli.localId,
      clienteId: cli.id,
      uid: cli.uid
    };
  }

  return null;
}
