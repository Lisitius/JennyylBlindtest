import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/session";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const entier = (v, max = 100000) =>
  Math.max(0, Math.min(max, parseInt(v, 10) || 0));

// --- Enregistre une partie terminée dans l'historique du joueur ---
export async function POST(req) {
  const userId = await currentUserId();
  // Non connecté : on ignore silencieusement, la partie reste jouable.
  if (!userId) return NextResponse.json({ ok: false, enregistre: false });

  let c;
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const partie = {
    user_id: userId,
    source: String(c.source || "").slice(0, 80),
    source_name: String(c.sourceName || "").slice(0, 120),
    mode: String(c.mode || "full").slice(0, 20),
    nb_tracks: entier(c.nbTracks, 50),
    round_seconds: entier(c.roundSeconds, 300),
    score: entier(c.score),
    max_points: entier(c.maxPoints),
    titles_found: entier(c.titlesFound, 50),
    artists_found: entier(c.artistsFound, 50),
    films_found: entier(c.filmsFound, 50),
    items: Array.isArray(c.items) ? c.items.slice(0, 50) : [],
  };

  const res = await db("/games", {
    method: "POST",
    body: JSON.stringify(partie),
  });
  if (!res.ok) {
    return NextResponse.json({ ok: false, enregistre: false }, { status: 502 });
  }
  return NextResponse.json({ ok: true, enregistre: true });
}
