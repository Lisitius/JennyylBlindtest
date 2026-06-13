import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

export const dynamic = "force-dynamic";

// Spotify bloque la lecture des playlists publiques pour les nouvelles
// applications (403). Les thèmes sont donc générés via la recherche de
// titres (year:/genre:), en gardant les plus populaires pour rester devinable.
const THEMES = {
  "2000s": { label: "Années 2000", query: "year:2000-2009" },
  "90s": { label: "Années 90", query: "year:1990-1999" },
  pop: { label: "Pop", query: "genre:pop" },
  rock: { label: "Rock", query: "genre:rock" },
  rapfr: { label: "Rap FR", query: 'genre:"french hip hop"' },
};

// L'API limite la recherche à 10 résultats par page pour cette application,
// donc on agrège plusieurs pages à des positions aléatoires.
const PAGE_SIZE = 10;
const PAGES_PER_GAME = 8;
const MAX_OFFSET = 190;
const MAX_PER_ARTIST = 2;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const count = Math.min(
    parseInt(searchParams.get("count") || "10", 10) || 10,
    20
  );
  const theme = THEMES[key];
  if (!theme) {
    return NextResponse.json({ error: "unknown_theme" }, { status: 400 });
  }

  // Tire des offsets aléatoires distincts (multiples de 10).
  const allOffsets = shuffle(
    Array.from({ length: MAX_OFFSET / PAGE_SIZE + 1 }, (_, i) => i * PAGE_SIZE)
  ).slice(0, PAGES_PER_GAME);

  const pages = await Promise.all(
    allOffsets.map((offset) =>
      spotifyFetch(
        req,
        `/search?q=${encodeURIComponent(theme.query)}&type=track&limit=${PAGE_SIZE}&offset=${offset}`
      ).catch(() => null)
    )
  );

  if (pages.some((p) => p?.status === 401)) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const candidates = [];
  for (const p of pages) {
    if (p?.status !== 200) continue;
    for (const t of p.body?.tracks?.items || []) {
      if (
        t &&
        !t.is_local &&
        t.uri?.startsWith("spotify:track:") &&
        (t.duration_ms ?? 0) > 35_000
      ) {
        candidates.push(t);
      }
    }
  }

  if (!candidates.length) {
    return NextResponse.json(
      { error: "Impossible de générer ce thème. Réessaie dans un instant." },
      { status: 502 }
    );
  }

  // Les plus populaires d'abord (plus facile à deviner), puis on pioche.
  candidates.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  const pool = candidates.slice(0, Math.max(count * 4, 30));
  shuffle(pool);

  const seenTitles = new Set();
  const perArtist = new Map();
  const picked = [];
  for (const t of pool) {
    const titleKey = t.name.toLowerCase().split(" - ")[0].trim();
    const artistKey = (t.artists?.[0]?.name || "").toLowerCase();
    if (seenTitles.has(titleKey)) continue;
    if ((perArtist.get(artistKey) || 0) >= MAX_PER_ARTIST) continue;
    seenTitles.add(titleKey);
    perArtist.set(artistKey, (perArtist.get(artistKey) || 0) + 1);
    picked.push(t);
    if (picked.length >= count) break;
  }

  return NextResponse.json({
    tracks: picked.map((t) => ({
      uri: t.uri,
      name: t.name,
      artists: (t.artists || []).map((a) => a.name).join(", "),
      image: t.album?.images?.[0]?.url || null,
    })),
  });
}
