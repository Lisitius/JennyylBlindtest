import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { profilConnecte, peutAnimer } from "@/lib/roles";
import { genererCode, nettoyerSalonsInactifs } from "@/lib/rooms";

export const dynamic = "force-dynamic";

// --- Création d'un salon (réservé aux animateurs) ---
export async function POST(req) {
  const moi = await profilConnecte();
  if (!moi)
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (!peutAnimer(moi.role)) {
    return NextResponse.json(
      { error: "Seuls les animateurs peuvent créer un salon." },
      { status: 403 }
    );
  }

  let c;
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const nbTracks = [10, 15, 20].includes(Number(c.nbTracks)) ? Number(c.nbTracks) : 10;
  const roundSeconds = [15, 20, 30, 45].includes(Number(c.roundSeconds))
    ? Number(c.roundSeconds)
    : 30;
  const mode = ["full", "title", "title-film", "film"].includes(c.mode)
    ? c.mode
    : "full";

  // On récupère les morceaux via nos routes existantes (même vivier, même
  // filtrage) : le salon garde ensuite sa propre liste, figée.
  const origine = req.nextUrl.origin;
  const url = c.theme
    ? `${origine}/api/deezer/theme-tracks?key=${encodeURIComponent(c.theme)}&count=${nbTracks}`
    : c.artist
      ? `${origine}/api/deezer/artist-tracks?id=${encodeURIComponent(c.artist)}&count=${nbTracks}`
      : c.playlist
        ? `${origine}/api/deezer/playlist-tracks?id=${encodeURIComponent(c.playlist)}&count=${nbTracks}`
        : null;
  if (!url)
    return NextResponse.json({ error: "Aucun thème choisi." }, { status: 400 });

  let tracks = [];
  try {
    const r = await fetch(url, { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "chargement");
    tracks = d.tracks || [];
  } catch {
    return NextResponse.json(
      { error: "Impossible de préparer les chansons. Réessaie." },
      { status: 502 }
    );
  }
  if (tracks.length < 3) {
    return NextResponse.json(
      { error: "Pas assez de chansons pour ce thème." },
      { status: 502 }
    );
  }

  // Petit ménage : on efface les salons abandonnés depuis plus de 10 minutes.
  await nettoyerSalonsInactifs();

  // Code unique
  let code = null;
  for (let i = 0; i < 8 && !code; i++) {
    const essai = genererCode();
    const existe = await db(`/rooms?code=eq.${essai}&select=id`);
    if (existe.ok && Array.isArray(existe.body) && existe.body.length === 0) {
      code = essai;
    }
  }
  if (!code)
    return NextResponse.json({ error: "Réessaie dans un instant." }, { status: 503 });

  const creation = await db("/rooms", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      code,
      host_id: moi.userId,
      status: "lobby",
      settings: {
        nom: String(c.nom || "Blindtest").slice(0, 80),
        theme: c.theme || null,
        artist: c.artist || null,
        playlist: c.playlist || null,
        nbTracks,
        roundSeconds,
        mode,
      },
      tracks,
      auto_next: Boolean(c.autoNext),
      host_plays: c.hostPlays !== false,
    }),
  });
  if (!creation.ok) {
    return NextResponse.json(
      { error: "Impossible de créer le salon." },
      { status: 502 }
    );
  }
  const salon = Array.isArray(creation.body) ? creation.body[0] : creation.body;

  // L'animatrice rejoint son propre salon (elle peut jouer aussi).
  await db("/room_players", {
    method: "POST",
    body: JSON.stringify({
      room_id: salon.id,
      user_id: moi.userId,
      pseudo: moi.pseudo,
    }),
  });

  return NextResponse.json({ ok: true, code });
}
