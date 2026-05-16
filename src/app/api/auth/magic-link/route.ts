import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase/admin";
import { getOrCreateUserByEmail, setCustomClaims } from "@/lib/auth/server";
import { sincronizarSesionClientePorEmail } from "@/lib/auth/persistenciaCliente";
import { cols } from "@/lib/firebase/collections";
import { adminDb } from "@/lib/firebase/admin";
import { urlVerificacionLogin } from "@/lib/auth/continueUrl";
import {
  assertAllowedAuthRequest,
  mayExposeDevMagicLink
} from "@/lib/auth/allowedOrigins";
import { enviarEmailMagicLink } from "@/lib/email/magicLink";
import {
  buscarIdentidadPorEmail,
  upsertOwnerIndex
} from "@/lib/auth/identityIndex";
import { RUTA_DASHBOARD, RUTA_PORTAL } from "@/lib/auth/redirect";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  intent: z.enum(["auto", "cliente", "admin"]).default("auto"),
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
    const identidad = await buscarIdentidadPorEmail(email);

    if (intent === "admin") {
      if (!identidad || identidad.tipo !== "owner") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Este email no está autorizado como dueño. " +
              "Pedile al super-admin que te asigne acceso."
          },
          { status: 403 }
        );
      }
    } else if (intent === "cliente") {
      if (!identidad) {
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
    } else if (!identidad) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No encontramos una cuenta con ese email. " +
            'Si nunca te registraste, elegí "Registrarme por primera vez". ' +
            "Si sos dueño de un local, completá el onboarding o pedí acceso."
        },
        { status: 404 }
      );
    }

    let rolFinal: "admin" | "cliente";
    let uid: string;
    let nombreLocal: string | undefined;

    if (identidad?.tipo === "owner") {
      const auth = adminAuth();
      uid =
        identidad.uid ??
        (await auth.getUserByEmail(email)).uid;
      await setCustomClaims(uid, {
        role: "admin",
        localId: identidad.localId
      });
      await upsertOwnerIndex({
        email,
        localId: identidad.localId,
        uid
      });
      rolFinal = "admin";
      const localSnap = await cols.local(adminDb(), identidad.localId).get();
      nombreLocal =
        (localSnap.data() as { nombre?: string } | undefined)?.nombre ??
        identidad.localId;
    } else if (identidad?.tipo === "customer") {
      uid = await getOrCreateUserByEmail(email);
      const perfil = await sincronizarSesionClientePorEmail(
        uid,
        email,
        identidad.localId
      );
      if (!perfil) {
        return NextResponse.json(
          {
            ok: false,
            error: "No encontramos tu perfil de cliente. Pedile al local que te registre."
          },
          { status: 404 }
        );
      }
      rolFinal = "cliente";
      const localSnap = await cols.local(adminDb(), identidad.localId).get();
      nombreLocal =
        (localSnap.data() as { nombre?: string } | undefined)?.nombre ??
        identidad.localId;
    } else {
      return NextResponse.json(
        { ok: false, error: "No encontramos una cuenta con ese email." },
        { status: 404 }
      );
    }

    const redirectFinal =
      redirect ??
      (rolFinal === "admin" ? RUTA_DASHBOARD : RUTA_PORTAL);
    const continueUrl = urlVerificacionLogin({
      intent: rolFinal,
      redirect: redirectFinal
    });

    const auth = adminAuth();
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
