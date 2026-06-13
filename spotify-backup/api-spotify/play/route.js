import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function PUT(req) {
  const { deviceId, uri, positionMs } = await req.json();
  if (!deviceId || !uri) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }
  const r = await spotifyFetch(
    req,
    `/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ uris: [uri], position_ms: positionMs || 0 }),
    }
  );
  if (r.status >= 400) {
    console.log("[DEBUG play]", "device =", deviceId, "status =", r.status, JSON.stringify(r.body));
    const devices = await spotifyFetch(req, "/me/player/devices");
    console.log(
      "[DEBUG devices]",
      "status =", devices.status,
      JSON.stringify(
        (devices.body?.devices || []).map((d) => ({
          id: d.id,
          name: d.name,
          active: d.is_active,
        }))
      )
    );
  }
  if (r.status === 401) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  if (r.status === 403) {
    return NextResponse.json(
      { error: "Spotify Premium est requis pour la lecture dans le navigateur." },
      { status: 403 }
    );
  }
  if (r.status === 404) {
    return NextResponse.json(
      { error: "Lecteur introuvable. Recharge la page et réessaie." },
      { status: 404 }
    );
  }
  if (r.status >= 400) {
    return NextResponse.json(
      { error: `Erreur de lecture Spotify (${r.status})` },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
