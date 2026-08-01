import { NextResponse } from "next/server";
import { currentUserId, clearedSessionCookie } from "@/lib/session";
import { db, deleteUser, updateUser } from "@/lib/supabase";
import { validerPseudo, validerMotDePasse } from "@/lib/validation";

export const dynamic = "force-dynamic";

// --- Modifier le pseudo, le mot de passe ou les préférences ---
export async function PATCH(req) {
  const userId = await currentUserId();
  if (!userId)
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  let corps;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Pseudo
  if (corps.pseudo !== undefined) {
    const pseudo = String(corps.pseudo).trim();
    const erreur = validerPseudo(pseudo);
    if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });

    const pris = await db(
      `/profiles?pseudo=eq.${encodeURIComponent(pseudo)}&id=neq.${userId}&select=id`
    );
    if (pris.ok && Array.isArray(pris.body) && pris.body.length) {
      return NextResponse.json(
        { error: "Ce pseudo est déjà utilisé." },
        { status: 409 }
      );
    }

    const maj = await db(`/profiles?id=eq.${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ pseudo }),
    });
    if (!maj.ok)
      return NextResponse.json(
        { error: "Impossible de modifier le pseudo." },
        { status: 502 }
      );
    // On garde la copie dans le compte pour rester cohérent.
    await updateUser(userId, { user_metadata: { pseudo } });
    return NextResponse.json({ ok: true, pseudo });
  }

  // Mot de passe
  if (corps.motDePasse !== undefined) {
    const erreur = validerMotDePasse(corps.motDePasse);
    if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });
    const maj = await updateUser(userId, { password: corps.motDePasse });
    if (!maj.ok)
      return NextResponse.json(
        { error: "Impossible de modifier le mot de passe." },
        { status: 502 }
      );
    return NextResponse.json({ ok: true });
  }

  // Préférences de jeu (volume, nombre de musiques, durée, mode…)
  if (corps.prefs !== undefined) {
    const maj = await db(`/profiles?id=eq.${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ prefs: corps.prefs }),
    });
    if (!maj.ok)
      return NextResponse.json(
        { error: "Impossible d'enregistrer les préférences." },
        { status: 502 }
      );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Rien à modifier." }, { status: 400 });
}

// --- Suppression définitive du compte (droit à l'effacement) ---
export async function DELETE() {
  const userId = await currentUserId();
  if (!userId)
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  // La suppression du compte efface aussi profil et historique (cascade).
  const res = await deleteUser(userId);
  if (!res.ok)
    return NextResponse.json(
      { error: "Impossible de supprimer le compte." },
      { status: 502 }
    );

  const reponse = NextResponse.json({ ok: true });
  reponse.cookies.set(clearedSessionCookie());
  return reponse;
}
