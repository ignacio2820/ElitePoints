import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase/admin";
import { getOrCreateUserByEmail, setCustomClaims } from "@/lib/auth/server";
import { buscarClientePorEmailGlobal } from "@/lib/huellitas/clientesService";
import { vincularUsuarioACliente } from "@/lib/huellitas/clientesService";
import { cols } from "@/lib/firebase/collections";
import { adminDb } from "@/lib/firebase/admin";
import { urlVerificacionLogin } from "@/lib/auth/continueUrl";
import {
  assertAllowedAuthRequest,
  mayExposeDevMagicLink
} from "@/lib/auth/allowedOrigins";
import { enviarEmailMagicLink } from "@/lib/email/magicLink";

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
  try {
    assertAllowedAuthRequest(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Origen no autorizado";
    return NextResponse.json({ ok: false, error: msg }, { status: 403 });
  }

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
    } else if (mayExposeDevMagicLink()) {
      console.log("\n========== MAGIC LINK (DEV) ==========");
      console.log(`Para: ${email} (${rolFinal})`);
      console.log(link);
      console.log("======================================\n");
    }

    return NextResponse.json({
      ok: true,
      sent: enviarPorEmail,
      role: rolFinal,
      devLink: !enviarPorEmail && mayExposeDevMagicLink() ? link : undefined
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    console.error("[magic-link] error generando link:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
