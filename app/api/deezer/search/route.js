import { NextResponse } from "next/server";
import { dz } from "@/lib/deezer";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ artists: [], playlists: [] });
  }
  try {
    const [artists, playlists] = await Promise.all([
      dz(`/search/artist?q=${encodeURIComponent(q)}&limit=12`).catch(() => null),
      dz(`/search/playlist?q=${encodeURIComponent(q)}&limit=18`).catch(() => null),
    ]);
    return NextResponse.json({
      artists: (artists?.data || []).map((a) => ({
        id: a.id,
        name: a.name,
        image: a.picture_medium || a.picture || null,
        fans: a.nb_fan ?? null,
      })),
      playlists: (playlists?.data || []).map((p) => ({
        id: p.id,
        name: p.title,
        image: p.picture_medium || p.picture || null,
        tracksTotal: p.nb_tracks ?? null,
        author: p.user?.name || "",
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Deezer ne répond pas." },
      { status: 502 }
    );
  }
}
