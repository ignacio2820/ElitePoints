import { Timestamp } from "firebase-admin/firestore";
import {
  adminAuth,
  adminDb
} from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import {
  CONFIGURACION_DEFAULT,
  ConfiguracionLocalSchema,
  type ConfiguracionLocal,
  type Premio
} from "./types";
import { buscarSlugDisponible, esSlugValido, nombreASlug } from "./slug";
import {
  buscarClientePorEmailGlobal
} from "./clientesService";

/**
 * Catálogo inicial de premios que se siembra en cada Pet Shop nuevo.
 * Son genéricos y editables: el dueño los puede borrar, renombrar o
 * cambiar costo/nivel desde el panel de Configuración → Premios.
 *
 * La progresión apunta a guiar al dueño:
 *  - Premio "puerta de entrada" (bajo costo, sin nivel mínimo).
 *  - Premio intermedio (nivel Explorador).
 *  - Premio premium (nivel Gran Guardián con descuento fijo).
 */
function premiosInicialesGenericos(localId: string): Premio[] {
  return [
    {
      localId,
      nombre: "Snack para tu mascota",
      descripcion:
        "Una bolsita de snacks naturales para premiar a tu compañero. Editá este premio o sumá los tuyos desde Configuración → Premios.",
      costoHuellitas: 50,
      nivelMinimoId: "cachorro",
      categoria: "alimento",
      stock: null,
      activo: true,
      especiesObjetivo: []
    },
    {
      localId,
      nombre: "Juguete sorpresa",
      descripcion:
        "Un juguete a elección del local. Premio pensado para clientes que ya volvieron a comprar varias veces.",
      costoHuellitas: 200,
      nivelMinimoId: "explorador",
      categoria: "juguete",
      stock: null,
      activo: true,
      especiesObjetivo: []
    },
    {
      localId,
      nombre: "Servicio destacado",
      descripcion:
        "Beneficio premium reservado a tus clientes más fieles (corte, baño, consulta o lo que mejor calce con tu negocio).",
      costoHuellitas: 800,
      nivelMinimoId: "gran-guardian",
      categoria: "servicio",
      stock: null,
      activo: true,
      especiesObjetivo: []
    }
  ];
}

/**
 * Servicio server-side: registra un nuevo dueño y su Pet Shop.
 *
 * Flujo:
 *  1. Validar que el email no sea ya admin de otro local ni cliente.
 *  2. Generar slug único a partir del nombre.
 *  3. Crear /Locales/{slug} (datos básicos + activo).
 *  4. Crear /Locales/{slug}/ConfiguracionLocal/main con defaults saludables
 *     (1% de costo, niveles default, programa de referidos activo).
 *  5. Crear el user en Firebase Auth si no existe.
 *  6. Asignar customClaims { role: "admin", localId: slug } al user.
 *  7. Generar magic link para el primer ingreso.
 *
 * Es seguro porque corre con Admin SDK: solo desde server actions / API
 * con validación previa.
 */

export interface OnboardingInput {
  emailDueno: string;
  nombreLocal: string;
  telefonoWhatsapp?: string;
  logoUrl?: string;
}

export interface OnboardingResult {
  ok: true;
  localId: string;
  uid: string;
  magicLink: string;
}

export interface OnboardingError {
  ok: false;
  error: string;
  code:
    | "email-invalido"
    | "email-ya-admin"
    | "email-ya-cliente"
    | "nombre-invalido"
    | "auth-error"
    | "firestore-error";
}

/**
 * Configuración por defecto saludable: 1% de costo
 *   1000 pesos → 1 Huellita (acumulación)
 *   1 Huellita → 10 pesos (canje)
 *   ratio canje/acumulación = 10/1000 = 1%
 *
 * Esto deja al dueño un margen sano:
 *  - Cliente gasta $1000 → gana 1 Huellita ($10)
 *  - Liability del programa = 1% del ticket promedio
 *  - 50% de tope por venta → nunca pierden más que ese %
 */
function configDefault(localId: string): ConfiguracionLocal {
  return {
    ...CONFIGURACION_DEFAULT,
    localId,
    montoParaUnaHuellita: 1000,
    valorMonetarioHuellita: 10,
    diasVencimiento: 365,
    minimoHuellitasCanje: 10,
    topeDescuentoPorcentual: 0.5,
    emailsCumpleanosActivos: true
  };
}

async function localExiste(slug: string): Promise<boolean> {
  const snap = await cols.local(adminDb(), slug).get();
  return snap.exists;
}

/**
 * Punto de entrada del onboarding. Devuelve un objeto unión que el caller
 * puede pattern-matchear (ok:true | ok:false con código de error).
 */
export async function crearLocalYOnboarding(
  input: OnboardingInput
): Promise<OnboardingResult | OnboardingError> {
  const email = input.emailDueno.trim().toLowerCase();
  const nombreLocal = input.nombreLocal.trim();

  // 1. Validaciones básicas
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Email inválido.", code: "email-invalido" };
  }
  if (nombreLocal.length < 2 || nombreLocal.length > 80) {
    return {
      ok: false,
      error: "El nombre del local debe tener entre 2 y 80 caracteres.",
      code: "nombre-invalido"
    };
  }
  const baseSlug = nombreASlug(nombreLocal);
  if (!esSlugValido(baseSlug)) {
    return {
      ok: false,
      error:
        "El nombre del local no genera un identificador válido. Probá con otro nombre (al menos 2 letras o números).",
      code: "nombre-invalido"
    };
  }

  // 2. Email no debe ser admin de otro local ni cliente activo del sistema.
  const auth = adminAuth();
  let uidExistente: string | null = null;
  try {
    const u = await auth.getUserByEmail(email);
    uidExistente = u.uid;
    const claims = (u.customClaims ?? {}) as {
      role?: string;
      localId?: string;
    };
    if (claims.role === "admin") {
      return {
        ok: false,
        error: `Ese email ya administra el local "${claims.localId ?? "?"}". Ingresá desde la pantalla de login.`,
        code: "email-ya-admin"
      };
    }
  } catch {
    // No existe en Auth: vamos a crearlo después.
  }

  const yaCliente = await buscarClientePorEmailGlobal(email);
  if (yaCliente) {
    return {
      ok: false,
      error:
        "Ese email ya está registrado como cliente en un local. Para abrir un Pet Shop usá un email distinto.",
      code: "email-ya-cliente"
    };
  }

  // 3. Generar slug único (si el nombre ya está tomado, aparece sufijo numérico)
  const slug = await buscarSlugDisponible(baseSlug, localExiste);

  // 4. Crear el doc del local + configuración inicial + premios de muestra
  const db = adminDb();
  const ahora = Timestamp.now();

  try {
    const cfg = configDefault(slug);
    // Validamos antes de tocar Firestore para no dejar estados parciales.
    ConfiguracionLocalSchema.parse(cfg);
    const premios = premiosInicialesGenericos(slug);

    const batch = db.batch();
    batch.set(
      cols.local(db, slug),
      {
        nombre: nombreLocal,
        slug,
        activo: true,
        creadoEn: ahora,
        actualizadoEn: ahora,
        emailDueno: email,
        ...(input.telefonoWhatsapp
          ? { telefonoWhatsapp: input.telefonoWhatsapp.trim() }
          : {}),
        ...(input.logoUrl ? { logoUrl: input.logoUrl.trim() } : {})
      },
      { merge: true }
    );
    batch.set(
      cols.configuracion(db, slug),
      {
        ...cfg,
        actualizadoEn: ahora,
        actualizadoPor: "onboarding"
      },
      { merge: true }
    );

    // Sembramos los premios de muestra (cada uno con su doc-id auto).
    const premiosCol = cols.premios(db, slug);
    for (const premio of premios) {
      const ref = premiosCol.doc();
      batch.set(ref, {
        ...premio,
        creadoEn: ahora,
        actualizadoEn: ahora
      });
    }

    await batch.commit();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error escribiendo el local",
      code: "firestore-error"
    };
  }

  // 5. Crear/recuperar user de Firebase Auth.
  let uid = uidExistente;
  try {
    if (!uid) {
      const u = await auth.createUser({
        email,
        emailVerified: false,
        disabled: false,
        displayName: nombreLocal
      });
      uid = u.uid;
    }
  } catch (e) {
    // Rollback básico: borrar local recién creado para no dejar fantasmas.
    await cols.configuracion(db, slug).delete().catch(() => undefined);
    await cols.local(db, slug).delete().catch(() => undefined);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No pude crear el user en Auth",
      code: "auth-error"
    };
  }

  // 6. Asignar customClaims { role:"admin", localId:slug }.
  //    Esto es lo que vincula al usuario con su Pet Shop.
  try {
    await auth.setCustomUserClaims(uid!, { role: "admin", localId: slug });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No pude asignar permisos admin",
      code: "auth-error"
    };
  }

  // 7. Magic link de primera entrada (lo manda el caller por email o lo
  //    devuelve directo en dev).
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  const continueUrl = `${baseUrl}/login/verify?intent=admin&redirect=/admin`;
  const magicLink = await auth.generateSignInWithEmailLink(email, {
    url: continueUrl,
    handleCodeInApp: true
  });

  return { ok: true, localId: slug, uid: uid!, magicLink };
}
