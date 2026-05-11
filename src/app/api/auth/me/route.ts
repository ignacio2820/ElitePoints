import { NextResponse } from "next/server";
import { getSesion } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSesion();
  if (!s) return NextResponse.json({ ok: false, sesion: null }, { status: 200 });
  return NextResponse.json({ ok: true, sesion: s });
}
