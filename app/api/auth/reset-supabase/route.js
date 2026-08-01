import { NextResponse } from "next/server";
import { validerMotDePasse } from "@/lib/validation";
import { createSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

// Traite le lien de réinitialisation envoyé par l'emailing intégré de Supabase.
// Le lien renvoie un jeton temporaire : on s'en sert pour poser le nouveau mot
// de passe, puis on crée la session du site.
export async function POST(req) {
  let c;
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const erreur = validerMotDePasse(c.motDePasse);
  if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });

  const jeton = c.accessToken;
  if (!jeton)
    return NextResponse.json({ error: "Lien incomplet." }, { status: 400 });

  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${jeton}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: c.motDePasse }),
    cache: "no-store",
  });

  const corps = await res.json().catch(() => null);
  if (!res.ok || !corps?.id) {
    return NextResponse.json(
      { error: "Ce lien n'est plus valable. Refais une demande." },
      { status: 400 }
    );
  }

  const reponse = NextResponse.json({ ok: true });
  reponse.cookies.set(await createSessionCookie(corps.id));
  return reponse;
}
