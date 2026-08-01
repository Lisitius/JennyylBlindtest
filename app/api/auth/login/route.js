import { NextResponse } from "next/server";
import { verifyPassword, db } from "@/lib/supabase";
import { createSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req) {
  let corps;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const email = (corps.email || "").trim().toLowerCase();
  const motDePasse = corps.motDePasse || "";
  if (!email || !motDePasse) {
    return NextResponse.json(
      { error: "Email et mot de passe sont obligatoires." },
      { status: 400 }
    );
  }

  const res = await verifyPassword({ email, password: motDePasse });
  if (!res.ok) {
    // Message volontairement identique dans les deux cas : on n'indique pas
    // si c'est l'email ou le mot de passe qui est faux.
    return NextResponse.json(
      { error: "Email ou mot de passe incorrect." },
      { status: 401 }
    );
  }

  const userId = res.body?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Connexion impossible." }, { status: 502 });
  }

  const profil = await db(`/profiles?id=eq.${userId}&select=pseudo`);
  const pseudo =
    (Array.isArray(profil.body) && profil.body[0]?.pseudo) ||
    res.body?.user?.user_metadata?.pseudo ||
    "";

  const reponse = NextResponse.json({ ok: true, pseudo });
  reponse.cookies.set(await createSessionCookie(userId));
  return reponse;
}
