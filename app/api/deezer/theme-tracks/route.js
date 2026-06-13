import { NextResponse } from "next/server";
import { dz, pickGameTracks } from "@/lib/deezer";

export const dynamic = "force-dynamic";

// Playlists Deezer vérifiées le 13/06/2026 (toutes avec ≥58 extraits jouables
// et une bonne variété d'artistes). En cas de pépin, une recherche prend le
// relais via `query`.
const THEMES = {
  "70s": { label: "Années 70", playlistId: 13700409161, query: "disco funk 70s" },
  "80s": { label: "Années 80", playlistId: 96821901, query: "tubes années 80" },
  "90s": { label: "Années 90", playlistId: 1251125011, query: "hits années 90" },
  "2000s": { label: "Années 2000", playlistId: 248297032, query: "hits années 2000" },
  "2010s": { label: "Années 2010", playlistId: 15371784023, query: "tubes 2010s" },
  pop: { label: "Pop", playlistId: 1479458365, query: "pop hits" },
  rock: { label: "Rock", playlistId: 1306931615, query: "rock classics" },
  metal: { label: "Metal", playlistId: 61217294, query: "heavy metal hits" },
  rapfr: { label: "Rap FR", playlistId: 1071669561, query: "rap français" },
  varietefr: { label: "Variété FR", playlistId: 1420459465, query: "variété française" },
  karaoke: { label: "Karaoké FR", playlistId: 7064556104, query: "karaoké français" },
  disney: { label: "Disney", playlistId: 1032758771, query: "disney français" },
  films: { label: "Films & Séries", playlistId: 8531512122, query: "musiques de films cultes" },
  electro: { label: "Électro", playlistId: 7188387004, query: "electro dance hits" },
  latino: { label: "Latino", playlistId: 10399915842, query: "latino reggaeton hits" },
  reggae: { label: "Reggae", playlistId: 8291980982, query: "reggae roots bob marley" },
  kpop: { label: "K-Pop", playlistId: 10730307122, query: "kpop hits" },
  jazz: { label: "Jazz", playlistId: 1615514485, query: "jazz classics" },
};

async function playlistRawTracks(playlistId) {
  const body = await dz(`/playlist/${playlistId}/tracks?limit=100`);
  return body?.data || [];
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

  try {
    // 1) Playlist vérifiée du thème.
    try {
      const tracks = pickGameTracks(await playlistRawTracks(theme.playlistId), count);
      if (tracks.length >= Math.min(count, 5)) {
        return NextResponse.json({ tracks });
      }
    } catch {
      // on passe à la recherche
    }

    // 2) Secours : on cherche une autre playlist du même thème.
    const search = await dz(
      `/search/playlist?q=${encodeURIComponent(theme.query)}&limit=5`
    );
    for (const p of search?.data || []) {
      try {
        const tracks = pickGameTracks(await playlistRawTracks(p.id), count);
        if (tracks.length >= Math.min(count, 5)) {
          return NextResponse.json({ tracks });
        }
      } catch {
        // playlist suivante
      }
    }
    return NextResponse.json(
      { error: "Impossible de générer ce thème. Réessaie dans un instant." },
      { status: 502 }
    );
  } catch {
    return NextResponse.json(
      { error: "Deezer ne répond pas. Vérifie ta connexion internet." },
      { status: 502 }
    );
  }
}
