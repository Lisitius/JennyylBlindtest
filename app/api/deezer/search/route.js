import { NextResponse } from "next/server";
import { dz } from "@/lib/deezer";

export const dynamic = "force-dynamic";

const MIN_PLAYABLE = 20; // titres jouables minimum pour afficher une playlist
const MAX_RESULTS = 12; // playlists affichées au final
const MAX_VERIFY = 18; // playlists candidates réellement vérifiées

function playableCount(data) {
  return (data || []).filter(
    (t) => t && typeof t.preview === "string" && t.preview.length > 10
  ).length;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ artists: [], playlists: [] });
  }
  try {
    const [artists, playlists] = await Promise.all([
      dz(`/search/artist?q=${encodeURIComponent(q)}&limit=12`).catch(() => null),
      dz(`/search/playlist?q=${encodeURIComponent(q)}&limit=40`).catch(() => null),
    ]);

    // On écarte d'abord les playlists de moins de 20 titres (info gratuite),
    // puis on vérifie le nombre réel de titres jouables (avec extrait audio)
    // pour ne garder que celles réellement utilisables.
    const candidates = (playlists?.data || [])
      .filter((p) => p && p.id && (p.nb_tracks ?? 0) >= MIN_PLAYABLE)
      .slice(0, MAX_VERIFY);

    const verified = await Promise.all(
      candidates.map(async (p) => {
        try {
          const body = await dz(`/playlist/${p.id}/tracks?limit=100`);
          const playable = playableCount(body?.data);
          if (playable < MIN_PLAYABLE) return null;
          return {
            id: p.id,
            name: p.title,
            image: p.picture_medium || p.picture || null,
            tracksTotal: playable,
            author: p.user?.name || "",
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      artists: (artists?.data || []).map((a) => ({
        id: a.id,
        name: a.name,
        image: a.picture_medium || a.picture || null,
        fans: a.nb_fan ?? null,
      })),
      playlists: verified.filter(Boolean).slice(0, MAX_RESULTS),
    });
  } catch {
    return NextResponse.json(
      { error: "Deezer ne répond pas." },
      { status: 502 }
    );
  }
}
