import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/session";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// --- Historique + statistiques du joueur ---
export async function GET() {
  const userId = await currentUserId();
  if (!userId)
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const res = await db(
    `/games?user_id=eq.${userId}&select=id,played_at,source,source_name,mode,nb_tracks,round_seconds,score,max_points,titles_found,artists_found,films_found&order=played_at.desc&limit=100`
  );
  if (!res.ok) {
    return NextResponse.json({ parties: [], stats: null });
  }
  const parties = Array.isArray(res.body) ? res.body : [];

  // Statistiques
  const total = parties.length;
  const sommeScore = parties.reduce((s, p) => s + (p.score || 0), 0);
  const sommeMax = parties.reduce((s, p) => s + (p.max_points || 0), 0);
  const meilleur = parties.reduce(
    (best, p) =>
      !best || (p.max_points ? p.score / p.max_points : 0) > (best.max_points ? best.score / best.max_points : 0)
        ? p
        : best,
    null
  );

  // Thème favori + record par thème
  const parTheme = new Map();
  for (const p of parties) {
    const nom = p.source_name || p.source || "—";
    const t = parTheme.get(nom) || { nom, parties: 0, meilleurPct: 0, meilleurScore: 0, max: 0 };
    t.parties++;
    const pct = p.max_points ? p.score / p.max_points : 0;
    if (pct >= t.meilleurPct) {
      t.meilleurPct = pct;
      t.meilleurScore = p.score;
      t.max = p.max_points;
    }
    parTheme.set(nom, t);
  }
  const themes = [...parTheme.values()].sort((a, b) => b.parties - a.parties);

  return NextResponse.json({
    parties,
    stats: {
      partiesJouees: total,
      scoreMoyen: total ? Math.round(sommeScore / total) : 0,
      pourcentMoyen: sommeMax ? Math.round((sommeScore / sommeMax) * 100) : 0,
      meilleurScore: meilleur ? meilleur.score : 0,
      meilleurMax: meilleur ? meilleur.max_points : 0,
      meilleurTheme: meilleur ? meilleur.source_name : null,
      themeFavori: themes[0]?.nom || null,
      titresTrouves: parties.reduce((s, p) => s + (p.titles_found || 0), 0),
      artistesTrouves: parties.reduce((s, p) => s + (p.artists_found || 0), 0),
      filmsTrouves: parties.reduce((s, p) => s + (p.films_found || 0), 0),
      chansonsJouees: parties.reduce((s, p) => s + (p.nb_tracks || 0), 0),
      themes,
    },
  });
}
