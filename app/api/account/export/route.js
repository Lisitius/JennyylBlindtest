import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/session";
import { db, getUser } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// --- Droit à la portabilité : télécharger toutes ses données ---
export async function GET() {
  const userId = await currentUserId();
  if (!userId)
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const [profil, parties, compte] = await Promise.all([
    db(`/profiles?id=eq.${userId}&select=pseudo,created_at,prefs`),
    db(`/games?user_id=eq.${userId}&select=*&order=played_at.desc`),
    getUser(userId),
  ]);

  const donnees = {
    exporte_le: new Date().toISOString(),
    compte: {
      email: compte.body?.email || null,
      cree_le: compte.body?.created_at || null,
      // Le mot de passe n'est volontairement pas exportable : il n'existe
      // nulle part en clair, seule une empreinte irréversible est stockée.
      mot_de_passe: "jamais stocké (empreinte irréversible uniquement)",
    },
    profil: Array.isArray(profil.body) ? profil.body[0] : null,
    parties: Array.isArray(parties.body) ? parties.body : [],
  };

  return new NextResponse(JSON.stringify(donnees, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mes-donnees-blindtest.json"',
    },
  });
}
