import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function PUT(req) {
  const { deviceId } = await req.json().catch(() => ({}));
  const qs = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
  // Si rien n'est en cours de lecture, Spotify peut renvoyer une erreur :
  // ce n'est pas grave, on répond toujours ok.
  await spotifyFetch(req, `/me/player/pause${qs}`, { method: "PUT" });
  return NextResponse.json({ ok: true });
}
