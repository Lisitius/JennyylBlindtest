import { NextResponse } from "next/server";
import { dz, pickAvoidingPlayed, parseExcluded } from "@/lib/deezer";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const count = Math.min(
    parseInt(searchParams.get("count") || "10", 10) || 10,
    20
  );
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }
  try {
    const body = await dz(`/playlist/${id}/tracks?limit=100`);
    const { tracks, exhausted } = pickAvoidingPlayed(
      body?.data || [],
      count,
      parseExcluded(searchParams)
    );
    if (!tracks.length) {
      return NextResponse.json(
        { error: "Cette playlist n'a pas d'extraits jouables." },
        { status: 404 }
      );
    }
    return NextResponse.json({ tracks, exhausted });
  } catch {
    return NextResponse.json(
      { error: "Playlist introuvable sur Deezer." },
      { status: 404 }
    );
  }
}
