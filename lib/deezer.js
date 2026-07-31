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

// Retire les mentions de bande originale du titre affiché, qui sont longues
// et dévoileraient le film à deviner. Ex :
// 'Libérée, Délivrée (De "La Reine des Neiges"/Bande Originale Française)'
function cleanDisplayTitle(title) {
  const cleaned = (title || "")
    .replace(
      /\s*[([][^)\]]*(?:bande originale|soundtrack|from\s+["“«]|de\s+["“«])[^)\]]*[)\]]/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || title;
}

function toGameTrack(t) {
  const displayName = t.filmName ? cleanDisplayTitle(t.title) : t.title;
  return {
    // Identifiant Deezer : sert à mémoriser les morceaux déjà joués.
    id: String(t.id ?? ""),
    preview: t.preview,
    name: displayName,
    // title_short = titre sans "(feat. X)" : idéal pour la validation.
    matchName: t.title_short || displayName,
    artists: t.artist?.name || "",
    image: t.album?.cover_big || t.album?.cover_medium || t.album?.cover || null,
    // Rempli uniquement pour les thèmes Disney / Films.
    // `filmAlt` = titre d'origine (souvent anglais), accepté aussi en réponse.
    ...(t.filmName ? { film: t.filmName } : {}),
    ...(t.filmName && t.filmAlt ? { filmAlt: t.filmAlt } : {}),
  };
}

// Déduit le nom du film depuis le titre ("... (De \"Aladdin\")") ou, à défaut,
// depuis le nom de l'album de bande originale.
export function extractFilm(albumTitle, trackTitle) {
  const m = (trackTitle || "").match(
    /\(?(?:De|From|Extrait de)\s+["“«]([^"”»]+)["”»]/i
  );
  if (m) return m[1].trim();
  let a = (albumTitle || "").replace(/\(.*?\)/g, " ").replace(/\[.*?\]/g, " ");
  a = a.split(" - ")[0];
  a = a
    .replace(/\b(original )?(motion picture )?soundtrack\b/i, " ")
    .replace(/\bbande originale.*$/i, " ")
    .replace(/\boriginal score\b/i, " ")
    .replace(/\bdeluxe( edition)?\b/i, " ")
    .replace(/\s+original\s*$/i, " ")
    .replace(/\s*\/\s*ost\s*$/i, " ");
  return a.replace(/\s+/g, " ").trim();
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

// Comme pickGameTracks, mais en évitant les morceaux déjà joués. Quand le
// vivier est épuisé, on repart de zéro et on le signale (`exhausted`) pour que
// le jeu remette sa mémoire à blanc.
export function pickAvoidingPlayed(rawTracks, count, playedIds, maxPerArtist) {
  const played = new Set(playedIds || []);
  if (played.size) {
    const fresh = (rawTracks || []).filter(
      (t) => !played.has(String(t?.id ?? ""))
    );
    const picked = pickGameTracks(fresh, count, maxPerArtist);
    if (picked.length >= count) return { tracks: picked, exhausted: false };
  }
  return {
    tracks: pickGameTracks(rawTracks, count, maxPerArtist),
    exhausted: played.size > 0,
  };
}

// Lit le paramètre ?exclude=id1,id2,… d'une requête.
export function parseExcluded(searchParams) {
  return (searchParams.get("exclude") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
