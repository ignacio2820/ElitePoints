import { NextResponse } from "next/server";
import { COOKIE_SESION } from "@/lib/auth/types";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_SESION,
    value: "",
    path: "/",
    maxAge: 0
  });
  return res;
}
