/**
 * scripts/fusionar-clientes-duplicados.ts
 *
 * Busca clientes con el mismo email dentro de cada Locales/{localId}/Clientes,
 * fusiona saldos en el perfil canónico (más antiguo / con datos reales) y
 * elimina duplicados fantasma (típicamente saldo 0 tras re-registro).
 *
 * Uso:
 *   npm run fusionar-duplicados -- --localId=mi-tienda          # simulación
 *   npm run fusionar-duplicados -- --localId=mi-tienda --confirm
 *   npm run fusionar-duplicados -- --all --confirm
 *
 * Requiere .env.local con credenciales de Firebase Admin.
 */

import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
import readline from "node:readline";

dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

import type { DocumentReference, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../src/lib/firebase/admin";
import { cols } from "../src/lib/firebase/collections";
import { upsertCustomerIndex } from "../src/lib/auth/identityIndex";
import { aDocId } from "../src/lib/huellitas/codigosClientes";
import { calcularNivel } from "../src/lib/huellitas/engine";
import { getConfiguracion } from "../src/lib/huellitas/service";
import type { Cliente } from "../src/lib/huellitas/types";

type ClienteSnap = {
  id: string;
  ref: DocumentReference;
  data: Partial<Cliente> & { uid?: string };
};

type GrupoDuplicado = {
  email: string;
  miembros: ClienteSnap[];
};

type AccionFusion = {
  localId: string;
  email: string;
  canonicoId: string;
  canonicoNombre: string;
  eliminados: string[];
  saldoAntes: number;
  saldoDespues: number;
  acumuladoAntes: number;
  acumuladoDespues: number;
  lotesMovidos: number;
};

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseCreadoEnMs(val: unknown): number {
  if (!val) return Number.POSITIVE_INFINITY;
  if (typeof val === "string") {
    const t = Date.parse(val);
    return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
  }
  if (val instanceof Date) return val.getTime();
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as Timestamp).toDate().getTime();
  }
  return Number.POSITIVE_INFINITY;
}

function nombrePareceReal(nombre: string): boolean {
  const n = nombre.trim();
  if (n.length < 2) return false;
  if (/^(cliente|usuario|sin nombre|—|-)$/i.test(n)) return false;
  return true;
}

/**
 * Elige el perfil que conservamos: prioriza uid, nombre real, antigüedad y saldo.
 */
function elegirCanonico(miembros: ClienteSnap[]): ClienteSnap {
  const ordenados = [...miembros].sort((a, b) => puntajeCanonico(b) - puntajeCanonico(a));
  return ordenados[0];
}

function puntajeCanonico(c: ClienteSnap): number {
  const d = c.data;
  let score = 0;
  if (d.uid) score += 10_000;
  if (d.primerCompraRegistrada) score += 500;
  if (nombrePareceReal(String(d.nombre ?? ""))) score += 300;
  if (d.codigoCliente) score += 100;
  if (d.codigoReferido) score += 50;

  const saldo = d.saldoHuellitas ?? 0;
  const acum = d.acumuladoHistorico ?? 0;
  score += saldo + acum * 0.1;

  const creado = parseCreadoEnMs(d.creadoEn);
  if (Number.isFinite(creado)) {
    score += (Date.now() - creado) / 86_400_000;
  }

  return score;
}

async function agruparDuplicadosPorEmail(
  localId: string
): Promise<GrupoDuplicado[]> {
  const db = adminDb();
  const snap = await cols.clientes(db, localId).get();
  const porEmail = new Map<string, ClienteSnap[]>();

  for (const doc of snap.docs) {
    const data = doc.data() as Partial<Cliente> & { uid?: string };
    const email = normalizarEmail(String(data.email ?? ""));
    if (!email || !email.includes("@")) continue;

    const lista = porEmail.get(email) ?? [];
    lista.push({ id: doc.id, ref: doc.ref, data });
    porEmail.set(email, lista);
  }

  const grupos: GrupoDuplicado[] = [];
  for (const [email, miembros] of porEmail) {
    if (miembros.length > 1) grupos.push({ email, miembros });
  }
  return grupos;
}

async function moverSubcoleccionHuellitas(
  localId: string,
  desdeId: string,
  haciaId: string
): Promise<number> {
  const db = adminDb();
  const snap = await cols.huellitas(db, localId, desdeId).get();
  if (snap.empty) return 0;

  let movidos = 0;
  const batch = db.batch();
  for (const doc of snap.docs) {
    const destino = cols.huellitas(db, localId, haciaId).doc(doc.id);
    batch.set(destino, doc.data());
    batch.delete(doc.ref);
    movidos++;
  }
  await batch.commit();
  return movidos;
}

async function borrarSubcoleccion(parentPath: string, sub: string): Promise<number> {
  const db = adminDb();
  const ref = db.collection(`${parentPath}/${sub}`);
  const snap = await ref.get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

async function borrarClienteCompleto(
  localId: string,
  cliente: ClienteSnap,
  confirm: boolean
): Promise<void> {
  const db = adminDb();
  const data = cliente.data;
  const parentPath = `Locales/${localId}/Clientes/${cliente.id}`;

  if (!confirm) return;

  await borrarSubcoleccion(parentPath, "Huellitas");
  await borrarSubcoleccion(parentPath, "Mascotas");

  if (data.codigoCliente) {
    await cols
      .codigoCliente(db, localId, aDocId(data.codigoCliente))
      .delete()
      .catch(() => undefined);
  }
  if (data.codigoReferido) {
    await cols
      .referido(db, localId, data.codigoReferido)
      .delete()
      .catch(() => undefined);
  }

  await cliente.ref.delete();

  if (data.uid) {
    try {
      const u = await adminAuth().getUser(data.uid);
      if ((u.customClaims ?? {}).role !== "admin") {
        await adminAuth().deleteUser(data.uid);
      }
    } catch {
      // uid ya no existe en Auth
    }
  }
}

async function fusionarGrupo(
  localId: string,
  grupo: GrupoDuplicado,
  confirm: boolean
): Promise<AccionFusion | null> {
  const canonico = elegirCanonico(grupo.miembros);
  const duplicados = grupo.miembros.filter((m) => m.id !== canonico.id);
  if (duplicados.length === 0) return null;

  const saldoAntes = canonico.data.saldoHuellitas ?? 0;
  const acumuladoAntes = canonico.data.acumuladoHistorico ?? 0;

  let saldoExtra = 0;
  let acumuladoExtra = 0;
  let reservadasExtra = 0;
  let referidosTotalesExtra = 0;
  let referidosActivadosExtra = 0;
  let uid = canonico.data.uid;
  let telefono = String(canonico.data.telefono ?? "").trim();
  let lotesMovidos = 0;

  const eliminados: string[] = [];

  for (const dup of duplicados) {
    const esFantasma =
      (dup.data.saldoHuellitas ?? 0) === 0 &&
      (dup.data.acumuladoHistorico ?? 0) === 0;

    saldoExtra += dup.data.saldoHuellitas ?? 0;
    acumuladoExtra += dup.data.acumuladoHistorico ?? 0;
    reservadasExtra += dup.data.huellitasReservadas ?? 0;
    referidosTotalesExtra += dup.data.referidosTotales ?? 0;
    referidosActivadosExtra += dup.data.referidosActivados ?? 0;

    if (!uid && dup.data.uid) uid = dup.data.uid;
    if (!telefono && dup.data.telefono) telefono = String(dup.data.telefono).trim();

    if (confirm) {
      lotesMovidos += await moverSubcoleccionHuellitas(
        localId,
        dup.id,
        canonico.id
      );
    } else {
      const lotesSnap = await cols.huellitas(adminDb(), localId, dup.id).get();
      lotesMovidos += lotesSnap.size;
    }

    eliminados.push(
      `${dup.id} (${dup.data.nombre ?? "—"}, saldo=${dup.data.saldoHuellitas ?? 0}${esFantasma ? ", fantasma" : ""})`
    );

    await borrarClienteCompleto(localId, dup, confirm);
  }

  const saldoDespues = saldoAntes + saldoExtra;
  const acumuladoDespues = acumuladoAntes + acumuladoExtra;
  let reservadas = (canonico.data.huellitasReservadas ?? 0) + reservadasExtra;
  reservadas = Math.min(reservadas, saldoDespues);

  if (confirm) {
    const cfg = await getConfiguracion(localId);
    const nivel = calcularNivel(acumuladoDespues, cfg.niveles);

    await canonico.ref.update({
      saldoHuellitas: saldoDespues,
      acumuladoHistorico: acumuladoDespues,
      huellitasReservadas: reservadas,
      referidosTotales:
        (canonico.data.referidosTotales ?? 0) + referidosTotalesExtra,
      referidosActivados:
        (canonico.data.referidosActivados ?? 0) + referidosActivadosExtra,
      nivelId: nivel.id,
      ...(uid ? { uid } : {}),
      ...(telefono ? { telefono } : {}),
      email: grupo.email
    });

    await upsertCustomerIndex({
      email: grupo.email,
      localId,
      clienteId: canonico.id,
      uid
    });
  }

  return {
    localId,
    email: grupo.email,
    canonicoId: canonico.id,
    canonicoNombre: String(canonico.data.nombre ?? "—"),
    eliminados,
    saldoAntes,
    saldoDespues,
    acumuladoAntes,
    acumuladoDespues,
    lotesMovidos
  };
}

async function procesarLocal(
  localId: string,
  confirm: boolean
): Promise<AccionFusion[]> {
  const grupos = await agruparDuplicadosPorEmail(localId);
  if (grupos.length === 0) {
    console.log(`   • ${localId}: sin emails duplicados.`);
    return [];
  }

  console.log(`\n→ ${localId}: ${grupos.length} email(s) con duplicados`);
  const acciones: AccionFusion[] = [];

  for (const grupo of grupos) {
    const accion = await fusionarGrupo(localId, grupo, confirm);
    if (!accion) continue;
    acciones.push(accion);

    console.log(`\n   📧 ${grupo.email}`);
    console.log(
      `      Canónico: ${accion.canonicoId} (${accion.canonicoNombre})`
    );
    console.log(
      `      Saldo: ${accion.saldoAntes} → ${accion.saldoDespues} | Acumulado: ${accion.acumuladoAntes} → ${accion.acumuladoDespues}`
    );
    if (accion.lotesMovidos > 0) {
      console.log(`      Lotes Huellitas movidos: ${accion.lotesMovidos}`);
    }
    console.log(`      Eliminar (${accion.eliminados.length}):`);
    for (const e of accion.eliminados) {
      console.log(`        - ${e}`);
    }
  }

  return acciones;
}

function parseArgs(): { localId?: string; all: boolean; confirm: boolean } {
  const args = process.argv.slice(2);
  let localId: string | undefined;
  let all = false;
  let confirm = false;

  for (const a of args) {
    if (a === "--confirm") confirm = true;
    else if (a === "--all") all = true;
    else if (a.startsWith("--localId=")) localId = a.split("=")[1]?.trim();
    else if (!a.startsWith("--")) localId = a;
  }

  return { localId, all, confirm };
}

async function pedirConfirmacion(pregunta: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(pregunta, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "si");
    });
  });
}

async function main() {
  const { localId, all, confirm } = parseArgs();

  if (!all && !localId) {
    console.error(
      "Uso:\n" +
        "  npm run fusionar-duplicados -- --localId=<id>\n" +
        "  npm run fusionar-duplicados -- --localId=<id> --confirm\n" +
        "  npm run fusionar-duplicados -- --all --confirm"
    );
    process.exit(1);
  }

  if (!confirm) {
    console.log("\n⚠️  MODO SIMULACIÓN (dry-run). No se escribe en Firestore.");
    console.log("    Agregá --confirm para aplicar cambios.\n");
  } else {
    const ok = await pedirConfirmacion(
      "¿Fusionar duplicados y borrar perfiles fantasma? Escribí 'si': "
    );
    if (!ok) {
      console.log("Cancelado.");
      return;
    }
  }

  const locales: string[] = [];
  if (all) {
    const refs = await adminDb().collection("Locales").listDocuments();
    locales.push(...refs.map((r) => r.id));
  } else if (localId) {
    locales.push(localId);
  }

  let totalGrupos = 0;
  let totalEliminados = 0;

  for (const loc of locales) {
    const acciones = await procesarLocal(loc, confirm);
    totalGrupos += acciones.length;
    totalEliminados += acciones.reduce((n, a) => n + a.eliminados.length, 0);
  }

  console.log("\n════════════════════════════════════════");
  console.log(
    confirm
      ? "✅ Migración aplicada"
      : "ℹ️  Resumen de simulación (sin cambios)"
  );
  console.log(`   Emails con duplicados: ${totalGrupos}`);
  console.log(`   Perfiles a eliminar:  ${totalEliminados}`);
  console.log("════════════════════════════════════════\n");
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
