const BASE = "https://api.deezer.com";

// Appel à l'API Deezer (publique, sans clé). Toujours côté serveur :
// l'API ne répond pas aux navigateurs (CORS).
export async function dz(path) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) {
    throw new Error(body?.error?.message || `Erreur Deezer (${res.status})`);
  }
  return body;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toGameTrack(t) {
  return {
    preview: t.preview,
    name: t.title,
    // title_short = titre sans "(feat. X)" : idéal pour la validation.
    matchName: t.title_short || t.title,
    artists: t.artist?.name || "",
    image: t.album?.cover_big || t.album?.cover_medium || t.album?.cover || null,
  };
}

const MAX_PER_ARTIST = 2;

// Filtre les morceaux avec extrait audio, mélange, déduplique, et en
// sélectionne `count` pour une partie. maxPerArtist limite la répétition
// d'un même artiste (à désactiver pour un blindtest mono-artiste).
export function pickGameTracks(rawTracks, count, maxPerArtist = MAX_PER_ARTIST) {
  const valid = (rawTracks || []).filter(
    (t) => t && typeof t.preview === "string" && t.preview.length > 10
  );
  shuffle(valid);
  const seenTitles = new Set();
  const perArtist = new Map();
  const picked = [];
  for (const t of valid) {
    // Clé sans "(Live)", "(Remaster)"… pour éviter deux versions du même titre.
    const titleKey = (t.title_short || t.title || "")
      .toLowerCase()
      .replace(/\(.*?\)/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const artistKey = (t.artist?.name || "").toLowerCase();
    if (!titleKey || seenTitles.has(titleKey)) continue;
    if ((perArtist.get(artistKey) || 0) >= maxPerArtist) continue;
    seenTitles.add(titleKey);
    perArtist.set(artistKey, (perArtist.get(artistKey) || 0) + 1);
    picked.push(toGameTrack(t));
    if (picked.length >= count) break;
  }
  return picked;
}
