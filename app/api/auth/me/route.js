import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/session";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ connecte: false });

  const profil = await db(
    `/profiles?id=eq.${userId}&select=pseudo,created_at,prefs,role`
  );
  const p = Array.isArray(profil.body) ? profil.body[0] : null;
  if (!p) return NextResponse.json({ connecte: false });

  const role = p.role || "joueur";
  return NextResponse.json({
    connecte: true,
    pseudo: p.pseudo,
    membreDepuis: p.created_at,
    prefs: p.prefs || {},
    role,
    peutAnimer: role === "animateur" || role === "admin",
    estAdmin: role === "admin",
  });
}
