import { NextResponse } from "next/server";
import {
  leerActivationToken,
  mensajeMotivoToken,
  type MotivoTokenInvalido
} from "@/lib/huellitas/activationTokenService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = (url.searchParams.get("token") ?? "").trim();

  const resultado = await leerActivationToken(token);
  if (typeof resultado === "string") {
    const reason = resultado as MotivoTokenInvalido;
    return NextResponse.json({
      ok: false,
      reason,
      error: mensajeMotivoToken(reason)
    });
  }

  return NextResponse.json({
    ok: true,
    name: resultado.name,
    plan: resultado.plan,
    expiresAt: resultado.expiresAt.toISOString()
  });
}
