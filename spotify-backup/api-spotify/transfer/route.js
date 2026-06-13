import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function PUT(req) {
  const { deviceId } = await req.json();
  if (!deviceId) {
    return NextResponse.json({ error: "missing_device" }, { status: 400 });
  }
  const r = await spotifyFetch(req, "/me/player", {
    method: "PUT",
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  });
  console.log("[DEBUG transfer]", "device =", deviceId, "status =", r.status, r.status >= 400 ? JSON.stringify(r.body) : "");
  if (r.status === 401) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  if (r.status === 403) {
    return NextResponse.json(
      { error: "Spotify Premium est requis." },
      { status: 403 }
    );
  }
  // 404 = device pas encore visible côté Spotify : le jeu réessaiera au
  // moment de lancer la lecture, donc on ne bloque pas ici.
  return NextResponse.json({ ok: true });
}
