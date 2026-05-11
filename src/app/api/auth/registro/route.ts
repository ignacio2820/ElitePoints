import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { cols } from "@/lib/firebase/collections";
import {
  getOrCreateUserByEmail,
  setCustomClaims
} from "@/lib/auth/server";
import {
  buscarClientePorEmailGlobal,
  vincularUsuarioACliente
} from "@/lib/huellitas/clientesService";
import { crearClienteConReferido } from "@/lib/huellitas/referidosService";
import { enviarEmailMagicLink } from "@/lib/email/magicLink";
import { EspecieSchema } from "@/lib/huellitas/types";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  nombre: z.string().min(2, "Tu nombre es obligatorio").max(120),
  telefono: z.string().max(30).optional(),
  /** Si no viene, se usa NEXT_PUBLIC_DEFAULT_LOCAL_ID. */
  localId: z.string().min(1).optional(),
  /** Código de referido opcional (cliente vino con un link de invitación). */
  codigoReferido: z.string().max(20).optional(),
  mascota: z.object({
    nombre: z.string().min(1, "El nombre de la mascota es obligatorio").max(60),
    especie: EspecieSchema.default("perro"),
    raza: z.string().max(80).optional(),
    /** YYYY-MM-DD; si no se provee usamos un placeholder editable luego. */
    fechaNacimiento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
      .optional()
  })
});

function fechaPlaceholder(): string {
  const d = new Date();
  return `${d.getFullYear() - 1}-01-01`;
}

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
  const localId =
    data.localId ?? process.env.NEXT_PUBLIC_DEFAULT_LOCAL_ID ?? "";
  if (!localId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No hay un local configurado para auto-registro. " +
          "Definí NEXT_PUBLIC_DEFAULT_LOCAL_ID en .env.local."
      },
      { status: 500 }
    );
  }

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

    // 2. Email duplicado en algún cliente del sistema
    const existente = await buscarClientePorEmailGlobal(data.email);
    if (existente) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ya hay una cuenta asociada a este email. " +
            "Volvé a la pantalla de ingreso para entrar."
        },
        { status: 409 }
      );
    }

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

    // 6. Adjuntar mascota inicial + uid + claims
    const fechaNac = data.mascota.fechaNacimiento ?? fechaPlaceholder();
    await cols
      .cliente(adminDb(), localId, created.clienteId)
      .set(
        {
          uid,
          mascotas: [
            {
              nombre: data.mascota.nombre,
              especie: data.mascota.especie,
              raza: data.mascota.raza ?? "",
              fechaNacimiento: fechaNac
            }
          ]
        },
        { merge: true }
      );

    await setCustomClaims(uid, {
      role: "cliente",
      localId,
      clienteId: created.clienteId
    });
    await vincularUsuarioACliente(localId, created.clienteId, uid);

    // 7. Generar magic link de primera entrada
    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    ).replace(/\/$/, "");
    const continueUrl = `${baseUrl}/login/verify?intent=cliente`;

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
      devLink: !enviarPorEmail ? link : undefined,
      clienteId: created.clienteId,
      codigoReferido: created.codigoReferido,
      localId,
      nombreLocal
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
