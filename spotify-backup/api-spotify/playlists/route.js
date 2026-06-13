import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const r = await spotifyFetch(req, "/me/playlists?limit=50");
  if (r.status === 401) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  if (r.status >= 400) {
    return NextResponse.json(
      { error: `Erreur Spotify (${r.status})` },
      { status: 502 }
    );
  }
  const playlists = (r.body?.items || [])
    .filter(Boolean)
    .map((p) => ({
      id: p.id,
      name: p.name,
      image: p.images?.[0]?.url || null,
      // Spotify omet parfois tracks.total : null = inconnu (≠ vide).
      tracksTotal: p.tracks?.total ?? null,
      owner: p.owner?.display_name || "",
    }));
  return NextResponse.json({ playlists });
}
