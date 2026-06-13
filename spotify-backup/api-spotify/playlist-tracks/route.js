import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const count = Math.min(
    parseInt(searchParams.get("count") || "10", 10) || 10,
    20
  );
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  // Spotify restreint fortement les nouvelles applications : on essaie
  // plusieurs méthodes de lecture, de la plus complète à la plus minimale.
  let items = null;
  let authFailed = false;

  // Méthode 1 : /tracks par pages de 10 (le plafond imposé aux nouvelles apps).
  for (let offset = 0; offset < 100; offset += 10) {
    const r = await spotifyFetch(
      req,
      `/playlists/${encodeURIComponent(id)}/tracks?limit=10&offset=${offset}`
    );
    if (offset === 0)
      console.log("[DEBUG tracks p10]", id, "status =", r.status, "items =", r.body?.items?.length ?? "absent", r.status >= 400 ? JSON.stringify(r.body) : "");
    if (r.status === 401) authFailed = true;
    if (r.status !== 200 || !Array.isArray(r.body?.items)) break;
    items = (items || []).concat(r.body.items);
    if (r.body.items.length < 10) break;
  }

  // Méthode 2 : /tracks en un seul appel de 100.
  if (!items) {
    const r = await spotifyFetch(
      req,
      `/playlists/${encodeURIComponent(id)}/tracks?limit=100`
    );
    console.log("[DEBUG tracks p100]", id, "status =", r.status, "items =", r.body?.items?.length ?? "absent");
    if (r.status === 401) authFailed = true;
    if (r.status === 200 && Array.isArray(r.body?.items)) items = r.body.items;
  }

  // Méthode 3 : l'objet playlist complet, sans paramètre fields.
  // Nouveau format Spotify pour les apps récentes : les morceaux sont dans
  // une clé "items" à la racine (et non plus dans "tracks.items").
  if (!items) {
    const r = await spotifyFetch(req, `/playlists/${encodeURIComponent(id)}`);
    const found = Array.isArray(r.body?.tracks?.items)
      ? r.body.tracks.items
      : Array.isArray(r.body?.items)
        ? r.body.items
        : null;
    console.log(
      "[DEBUG playlist-full]", id,
      "status =", r.status,
      "items =", found?.length ?? "absent",
      "premier =", found?.[0] ? JSON.stringify(Object.keys(found[0])) : "-"
    );
    if (r.status === 401) authFailed = true;
    if (r.status === 200 && found) items = found;
  }

  if (authFailed) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  if (!items) {
    return NextResponse.json(
      {
        error:
          "Spotify bloque l'accès à cette playlist. Choisis-en une autre, ou utilise un thème.",
      },
      { status: 404 }
    );
  }

  const all = (items || [])
    // Selon le format, l'entrée est {track: {...}} ou directement le morceau.
    .map((i) => (i?.track ? i.track : i))
    .filter(
      (t) =>
        t &&
        !t.is_local &&
        t.uri &&
        t.uri.startsWith("spotify:track:") &&
        (t.duration_ms ?? 0) > 35_000
    );

  // Mélange (Fisher-Yates)
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  // Évite deux fois le même titre dans une partie
  const seen = new Set();
  const picked = [];
  for (const t of all) {
    const key = t.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
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
