import { NextResponse } from "next/server";
import { updateUser } from "@/lib/supabase";
import { verifierJetonReinit, consommerJeton } from "@/lib/reset";
import { validerMotDePasse } from "@/lib/validation";
import { createSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

// --- Vérifie qu'un lien est encore valide (avant d'afficher le formulaire) ---
export async function GET(req) {
  const jeton = req.nextUrl.searchParams.get("jeton");
  if (!jeton) return NextResponse.json({ valide: false });
  const info = await verifierJetonReinit(jeton);
  return NextResponse.json(
    info ? { valide: true, pseudo: info.pseudo } : { valide: false }
  );
}

// --- Applique le nouveau mot de passe ---
export async function POST(req) {
  let c;
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const erreur = validerMotDePasse(c.motDePasse);
  if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });

  const info = await verifierJetonReinit(c.jeton);
  if (!info) {
    return NextResponse.json(
      { error: "Ce lien n'est plus valable. Refais une demande." },
      { status: 400 }
    );
  }

  const maj = await updateUser(info.userId, { password: c.motDePasse });
  if (!maj.ok) {
    return NextResponse.json(
      { error: "Impossible de changer le mot de passe." },
      { status: 502 }
    );
  }

  // Le lien ne doit plus jamais fonctionner.
  await consommerJeton(info.userId, info.prefs);

  // On connecte directement la personne.
  const reponse = NextResponse.json({ ok: true, pseudo: info.pseudo });
  reponse.cookies.set(await createSessionCookie(info.userId));
  return reponse;
}
