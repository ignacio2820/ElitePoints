import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import {
  getOrCreateUserByEmail,
  setCustomClaims
} from "@/lib/auth/server";
import { vincularUsuarioACliente } from "@/lib/huellitas/clientesService";
import { normalizarEmailCliente } from "@/lib/huellitas/validarEmailCliente";
import {
  esEmailDuplicadoEnLocal,
  respuestaApiEmailDuplicado,
  validarEmailAntesDeCrearCliente
} from "@/lib/auth/persistenciaCliente";
import { crearClienteConReferido } from "@/lib/huellitas/referidosService";
import { mayExposeDevMagicLink } from "@/lib/auth/allowedOrigins";
import { enviarEmailMagicLink } from "@/lib/email/magicLink";
import { urlVerificacionLogin } from "@/lib/auth/continueUrl";
import { upsertCustomerIndex } from "@/lib/auth/identityIndex";
import { RUTA_PORTAL } from "@/lib/auth/redirect";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().transform((s) => normalizarEmailCliente(s)),
  nombre: z.string().min(2, "Tu nombre es obligatorio").max(120),
  telefono: z.string().max(30).optional(),
  localId: z.string().min(1, "Falta el local"),
  /** Código de referido opcional (cliente vino con un link de invitación). */
  codigoReferido: z.string().max(20).optional(),
  /** Cumpleaños del cliente (YYYY-MM-DD), opcional al registrarse. */
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
    .optional()
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const localId = data.localId;

  try {
    // 1. Verificar que el local exista (Firestore)
    const localSnap = await cols.local(adminDb(), localId).get();
    if (!localSnap.exists) {
      return NextResponse.json(
        { ok: false, error: `El local "${localId}" no existe.` },
        { status: 404 }
      );
    }
    const nombreLocal =
      (localSnap.data() as { nombre?: string } | undefined)?.nombre ?? localId;

    // 2. Correo único en este local (query directa Admin SDK)
    await validarEmailAntesDeCrearCliente({ localId, email: data.email });

    // 3. Validar rápido que Firebase Auth está accesible — si no,
    //    no creamos cliente en Firestore para evitar inconsistencias.
    const auth = adminAuth();
    try {
      await auth.listUsers(1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Auth no disponible";
      return NextResponse.json(
        { ok: false, error: `Firebase Auth no está habilitado: ${msg}` },
        { status: 500 }
      );
    }

    // 3.b Si ese email ya es ADMIN, NO permitimos registrarlo como cliente:
    //     evita pisar custom claims de admin al setearle role:"cliente".
    try {
      const u = await auth.getUserByEmail(data.email);
      if ((u.customClaims ?? {}).role === "admin") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Este email ya es dueño de un local. " +
              "Ingresá desde la pantalla de login (no necesitás registrarte)."
          },
          { status: 409 }
        );
      }
    } catch {
      // No existe en Auth todavía: seguimos.
    }

    // 4. Crear el cliente Firestore (con código de referido único).
    //    Lo hacemos antes de tocar Auth para que si algo falla acá,
    //    no quede un user huérfano en Auth sin claims.
    const created = await crearClienteConReferido({
      localId,
      cliente: {
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono ?? ""
      },
      codigoReferenteRaw: data.codigoReferido
    });

    // 5. Recién ahora creamos/recuperamos el user en Auth y le seteamos
    //    los claims. Si falla, hacemos rollback del cliente para no dejar
    //    estados parciales.
    let uid: string;
    try {
      uid = await getOrCreateUserByEmail(data.email);
    } catch (e) {
      // Rollback: borrar el cliente recién creado.
      await cols
        .cliente(adminDb(), localId, created.clienteId)
        .delete()
        .catch(() => undefined);
      const msg = e instanceof Error ? e.message : "Error creando usuario";
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }

    // 6. Vincular uid y datos opcionales del cliente
    await cols.cliente(adminDb(), localId, created.clienteId).set(
      {
        uid,
        ...(data.fechaNacimiento ? { fechaNacimiento: data.fechaNacimiento } : {})
      },
      { merge: true }
    );

    await setCustomClaims(uid, {
      role: "cliente",
      localId,
      clienteId: created.clienteId
    });
    await vincularUsuarioACliente(localId, created.clienteId, uid);
    await upsertCustomerIndex({
      email: data.email,
      localId,
      clienteId: created.clienteId,
      uid
    });

    // 7. Generar magic link de primera entrada
    const continueUrl = urlVerificacionLogin({
      intent: "cliente",
      redirect: RUTA_PORTAL
    });

    const link = await auth.generateSignInWithEmailLink(data.email, {
      url: continueUrl,
      handleCodeInApp: true
    });

    const enviarPorEmail = !!process.env.RESEND_API_KEY;
    if (enviarPorEmail) {
      try {
        await enviarEmailMagicLink({
          to: data.email,
          url: link,
          nombreLocal,
          rol: "cliente"
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error enviando email";
        return NextResponse.json(
          {
            ok: false,
            error: `Cuenta creada pero no pude enviar el email: ${msg}`,
            clienteId: created.clienteId
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      sent: enviarPorEmail,
      devLink:
        !enviarPorEmail && mayExposeDevMagicLink() ? link : undefined,
      clienteId: created.clienteId,
      codigoReferido: created.codigoReferido,
      localId,
      nombreLocal
    });
  } catch (err) {
    if (esEmailDuplicadoEnLocal(err)) {
      return NextResponse.json(respuestaApiEmailDuplicado(), { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
