import { NextResponse } from "next/server";
import { clearedSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const reponse = NextResponse.json({ ok: true });
  reponse.cookies.set(clearedSessionCookie());
  return reponse;
}
