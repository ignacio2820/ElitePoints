import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase/admin";
import { getOrCreateUserByEmail, setCustomClaims } from "@/lib/auth/server";
import { buscarClientePorEmailGlobal } from "@/lib/huellitas/clientesService";
import { vincularUsuarioACliente } from "@/lib/huellitas/clientesService";
import { enviarEmailMagicLink } from "@/lib/email/magicLink";
import { cols } from "@/lib/firebase/collections";
import { adminDb } from "@/lib/firebase/admin";
import { urlVerificacionLogin } from "@/lib/auth/continueUrl";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  /**
   * "auto" (recomendado): el server detecta el rol según custom claims y
   * registro de cliente. "admin"/"cliente" se mantienen por compatibilidad
   * y permiten forzar un intent específico (ej. desde un link interno).
   */
  intent: z.enum(["auto", "cliente", "admin"]).default("auto"),
  /** URL absoluta (de la app) a la que volver tras autenticar. */
  redirect: z.string().optional()
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
  const { email, intent, redirect } = parsed.data;

  try {
    const auth = adminAuth();

    let uid: string;
    let nombreLocal: string | undefined;
    /** Rol final detectado para esta sesión. Lo devolvemos al cliente. */
    let rolFinal: "admin" | "cliente";

    /**
     * Detecta si el email es admin sin crear usuario en Auth.
     * Devuelve { admin: true, ... } solo si ya existe en Auth con role:admin.
     */
    async function chequearAdmin(): Promise<
      | { admin: true; uid: string; localId: string }
      | { admin: false }
    > {
      try {
        const u = await auth.getUserByEmail(email);
        const claims = u.customClaims ?? {};
        if (claims.role === "admin" && typeof claims.localId === "string") {
          return { admin: true, uid: u.uid, localId: claims.localId };
        }
      } catch {
        // No existe en Auth: no es admin
      }
      return { admin: false };
    }

    if (intent === "admin") {
      // Forzar admin: si no es admin, 403 sin crear cuenta fantasma.
      const chk = await chequearAdmin();
      if (!chk.admin) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Este email no está autorizado como admin. " +
              "Pedile al super-admin que te asigne acceso."
          },
          { status: 403 }
        );
      }
      uid = chk.uid;
      rolFinal = "admin";
      const localSnap = await cols.local(adminDb(), chk.localId).get();
      nombreLocal =
        (localSnap.data() as { nombre?: string } | undefined)?.nombre ??
        chk.localId;
    } else if (intent === "cliente") {
      // Protección crítica: si el user existente ya es admin en Auth,
      // NUNCA pisamos sus claims con "cliente". Lo tratamos como admin.
      const chk = await chequearAdmin();
      if (chk.admin) {
        uid = chk.uid;
        rolFinal = "admin";
        const localSnap = await cols.local(adminDb(), chk.localId).get();
        nombreLocal =
          (localSnap.data() as { nombre?: string } | undefined)?.nombre ??
          chk.localId;
      } else {
        const cli = await buscarClientePorEmailGlobal(email);
        if (!cli) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "No encontramos una cuenta de cliente con ese email. " +
                "Pedile al local que te registre primero."
            },
            { status: 404 }
          );
        }
        uid = await getOrCreateUserByEmail(email);
        await setCustomClaims(uid, {
          role: "cliente",
          localId: cli.localId,
          clienteId: cli.id
        });
        await vincularUsuarioACliente(cli.localId, cli.id, uid);
        rolFinal = "cliente";

        const localSnap = await cols.local(adminDb(), cli.localId).get();
        nombreLocal =
          (localSnap.data() as { nombre?: string } | undefined)?.nombre ??
          cli.localId;
      }
    } else {
      // intent === "auto": detectamos el rol automáticamente.
      // 1) Primero probamos admin (no requiere DB beyond Auth).
      const chk = await chequearAdmin();
      if (chk.admin) {
        uid = chk.uid;
        rolFinal = "admin";
        const localSnap = await cols.local(adminDb(), chk.localId).get();
        nombreLocal =
          (localSnap.data() as { nombre?: string } | undefined)?.nombre ??
          chk.localId;
      } else {
        // 2) Si no es admin, buscamos como cliente registrado.
        const cli = await buscarClientePorEmailGlobal(email);
        if (!cli) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "No encontramos una cuenta con ese email. " +
                "Si nunca te registraste, hacé click en \"Crear cuenta\". " +
                "Si sos dueño de un local, pedí acceso al super-admin."
            },
            { status: 404 }
          );
        }
        uid = await getOrCreateUserByEmail(email);
        await setCustomClaims(uid, {
          role: "cliente",
          localId: cli.localId,
          clienteId: cli.id
        });
        await vincularUsuarioACliente(cli.localId, cli.id, uid);
        rolFinal = "cliente";

        const localSnap = await cols.local(adminDb(), cli.localId).get();
        nombreLocal =
          (localSnap.data() as { nombre?: string } | undefined)?.nombre ??
          cli.localId;
      }
    }

    // Genera el link de magic-link nativo de Firebase.
    // El destino siempre es /login/verify para que el cliente complete el
    // sign-in y el redirect post-login se decide ahí según el rol detectado.
    const redirectFinal =
      redirect ??
      (rolFinal === "admin" ? "/admin" : rolFinal === "cliente" ? "/mi-cuenta" : undefined);
    const continueUrl = urlVerificacionLogin({
      intent: rolFinal,
      redirect: redirectFinal
    });

    const link = await auth.generateSignInWithEmailLink(email, {
      url: continueUrl,
      handleCodeInApp: true
    });

    // En desarrollo sin Resend, devolvemos el link en la respuesta para
    // poder copiar/pegar y testear el flujo de inmediato.
    const enviarPorEmail = !!process.env.RESEND_API_KEY;
    if (enviarPorEmail) {
      try {
        await enviarEmailMagicLink({
          to: email,
          url: link,
          nombreLocal,
          rol: rolFinal
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error enviando email";
        return NextResponse.json(
          { ok: false, error: `No pude enviar el email: ${msg}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      sent: enviarPorEmail,
      role: rolFinal,
      // Sólo en dev para poder hacer copy-paste rápido del link.
      devLink: !enviarPorEmail ? link : undefined
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
