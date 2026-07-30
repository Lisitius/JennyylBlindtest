import { NextResponse } from "next/server";
import {
  dz,
  pickGameTracks,
  pickAvoidingPlayed,
  parseExcluded,
  extractFilm,
} from "@/lib/deezer";

export const dynamic = "force-dynamic";

// --- Thèmes à 3 champs (titre / artiste / film) ---
// Disney et Films exigent la version OFFICIELLE (bande originale), jamais une
// reprise ni une compilation : sinon l'artiste affiché n'est pas le bon.
// Films Disney recherchés un par un : c'est le seul moyen d'avoir une vraie
// diversité (une playlist unique ne couvre qu'une dizaine de films).
const DISNEY_FILMS = [
  "Aladdin", "Alerte Rouge", "Alice au Pays des Merveilles", "Atlantide",
  "Bambi", "Bernard et Bianca", "Blanche Neige", "Cendrillon", "Coco", "Dumbo",
  "Encanto", "Frère des Ours", "Hercule", "Kuzco", "La Belle au Bois Dormant",
  "La Belle et la Bête", "La Belle et le Clochard", "La Petite Sirène",
  "La Princesse et la Grenouille", "La Reine des Neiges", "La Reine des Neiges 2",
  "Le Bossu de Notre-Dame", "Le Livre de la Jungle", "Le Monde de Nemo",
  "Le Roi Lion", "Le Roi Lion 2", "Les 101 Dalmatiens", "Les Aristochats",
  "Les Indestructibles", "Lilo et Stitch", "L'Étrange Noël de Monsieur Jack",
  "Mary Poppins", "Merlin l'Enchanteur", "Monstres et Cie", "Mulan",
  "Oliver et Compagnie", "Peter et Elliott le dragon", "Peter Pan", "Pinocchio",
  "Pocahontas", "Raiponce", "Ratatouille", "Rebelle", "Robin des Bois",
  "Rox et Rouky", "Soul", "Tarzan", "Toy Story", "Vaiana", "Vaiana 2",
  "Vice-Versa", "Winnie l'Ourson", "Wish", "Zootopie",
];

// Vivier visé : 150 morceaux, avec au plus 10 titres d'un même film pour
// garder une bonne rotation. Les morceaux sont classés par popularité, donc
// la coupe à 150 conserve les chansons les plus connues.
const MAX_PER_FILM = 10;
const POOL_TARGET = 150;

// Compilations OFFICIELLES Disney : elles contiennent les vraies versions
// françaises de nombreux classiques absents des BO individuelles sur Deezer
// (Tarzan, Robin des Bois, Le Livre de la Jungle, Les Aristochats…).
const TRUSTED_ALBUM_QUERIES = [
  "Les 100 Plus Belles Chansons Disney",
  "Disney: Les 50 Plus Belles Chansons",
];
// Un album n'est retenu comme source officielle que si son titre correspond.
const TRUSTED_ALBUM_TITLE = /plus belles chansons/i;

// Les titres de ces compilations utilisent le nom anglais de certains films.
const EN_FR_FILMS = {
  "robin hood": "Robin des Bois",
  cinderella: "Cendrillon",
  "snow white": "Blanche Neige",
  "the jungle book": "Le Livre de la Jungle",
  "the aristocats": "Les Aristochats",
  "beauty and the beast": "La Belle et la Bête",
  "the lion king": "Le Roi Lion",
  "the little mermaid": "La Petite Sirène",
  "winnie the pooh": "Winnie l'Ourson",
  "lady and the tramp": "La Belle et le Clochard",
  "sleeping beauty": "La Belle au Bois Dormant",
  "alice in wonderland": "Alice au Pays des Merveilles",
};

// Compositeurs : leurs pistes sont des musiques de fond instrumentales,
// injouables en blindtest (on veut les chansons interprétées).
// Versions secondaires : génériques, thèmes de fin, reprises instrumentales.
const WEAK_TITLE =
  /g[eé]n[eé]rique|th[eè]me final|final theme|end (title|credit)|version instrumentale|\(instrumental|outro|intro\)|suite\)|inspir[ée] par|inspired by/i;

const SCORE_COMPOSERS =
  /patrick doyle|joby talbot|germaine franco|alan menken|hans zimmer|michael giacchino|randy newman|thomas newman|christophe beck|mark mancina|rachel portman|john powell|danny elfman|james newton howard|henry jackman|jerry goldsmith|george bruns|oliver wallace|frank churchill|leigh harline|paul j\.? smith|buddy baker|edward plumb|alan silvestri|dan romer/i;

const FILM_THEMES = {
  disney: {
    // Disney : uniquement la VF officielle (les voix françaises du film).
    albumRequired:
      /bande originale fran[cç]aise|version fran[cç]aise|french version|b\.?o\.?f\.?\b/i,
    searchQueries: [
      "disney bande originale francaise",
      "disney chansons francaises",
    ],
    playlistIds: [1032758771],
  },
  films: {
    albumRequired:
      /original motion picture soundtrack|motion picture soundtrack|bande originale|original soundtrack|\bost\b|original score/i,
    searchQueries: ["bandes originales films soundtrack", "musiques de films cultes"],
    playlistIds: [8531512122],
  },
};

// Compilations et interprètes de reprise : écartés dans tous les cas.
const COVER_ALBUM =
  /kids love|karaoke|tribute|\bcover|reprise|comptines|berceuses|medley|best of|greatest|top \d+|anthologie|compilation|\bthemes\b|ringtone|collection|hits|musiques? de films?/i;
const COVER_ARTIST =
  /orchestra|ensemble|musique de film|movie sounds|movie hits|\btheme|karaoke|tribute|\bcover|philharmonic|symphony|studio|various|unlimited|night at the movies|kids love|ch(?:œ|oe)urs?|chorus|choir|chorale|\bcast\b|acteurs? de/i;

// Ajoute au vivier les morceaux d'une liste de playlists qui remplissent
// les 3 champs (titre / artiste / film) en version officielle.
async function addPlaylists(ids, conf, pool, seenIds) {
  for (const id of ids) {
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    let tracks = [];
    try {
      const body = await dz(`/playlist/${id}/tracks?limit=100`);
      tracks = body?.data || [];
    } catch {
      continue;
    }
    for (const t of tracks) {
      const album = t?.album?.title || "";
      const artist = t?.artist?.name || "";
      if (!t?.preview) continue;
      if (!conf.albumRequired.test(album)) continue; // version officielle only
      if (COVER_ALBUM.test(album) || COVER_ARTIST.test(artist)) continue;
      const filmName = extractFilm(album, t.title);
      if (!filmName || filmName.length < 2) continue; // 3e champ introuvable
      pool.push({ ...t, filmName });
    }
  }
}

// Construit le vivier : d'abord les playlists de référence (les plus connues),
// et seulement si elles ne suffisent pas, on élargit via la recherche.
async function buildFilmPool(conf, needed) {
  const pool = [];
  const seenIds = new Set();
  await addPlaylists(conf.playlistIds, conf, pool, seenIds);
  if (pool.length >= needed * 3) return pool;

  const extra = [];
  for (const q of conf.searchQueries) {
    try {
      const s = await dz(`/search/playlist?q=${encodeURIComponent(q)}&limit=5`);
      for (const p of s?.data || []) if (p?.id) extra.push(p.id);
    } catch {
      // recherche suivante
    }
  }
  await addPlaylists(extra.slice(0, 5), conf, pool, seenIds);
  return pool;
}

// --- Vivier Disney : une recherche par film ---
// Le marqueur "Bande Originale Française" est souvent dans le TITRE du morceau
// et pas dans le nom de l'album, d'où la recherche par morceaux.
const norm = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Traduit un titre de film anglais en français si nécessaire.
function frenchFilmName(film) {
  const key = norm(film);
  for (const [en, fr] of Object.entries(EN_FR_FILMS)) {
    if (key === norm(en)) return fr;
  }
  return film;
}

// Ramène un libellé au nom canonique de la liste, pour éviter les doublons
// ("Pocahontas, Une Légende Indienne" et "Pocahontas - Une Légende Indienne"
// deviennent "Pocahontas"). On garde la correspondance la plus longue afin de
// ne pas confondre "La Reine des Neiges" et "La Reine des Neiges 2".
function canonicalFilmName(film) {
  const nf = norm(film);
  let best = null;
  for (const candidate of DISNEY_FILMS) {
    const nc = norm(candidate);
    if (nf.includes(nc) && (!best || nc.length > norm(best).length)) {
      best = candidate;
    }
  }
  return best || film;
}

// Un morceau est retenu si tous ses champs sont exploitables ET si l'artiste
// ne dévoile pas la réponse (ex. "Chœurs - Bambi" donnerait le film).
function acceptDisneyTrack(t, filmName, whitelist) {
  const title = t?.title || "";
  const artist = t?.artist?.name || "";
  if (!t?.preview) return false;
  if (COVER_ARTIST.test(artist) || SCORE_COMPOSERS.test(artist)) return false;
  if (WEAK_TITLE.test(title)) return false;
  // Medleys de dialogues ("Titre A/Titre B"). On ignore les parenthèses car le
  // format Disney contient un "/" légitime :
  // 'Je veux y croire (De "Raiponce"/Bande Originale Française du Film)'.
  if (title.replace(/\(.*?\)/g, " ").includes("/")) return false;
  if ((t.duration ?? 0) < 60) return false;
  if (!filmName || filmName.length < 2) return false;
  const nf = norm(filmName);
  // Le film doit appartenir à la liste (évite les résultats parasites).
  if (!whitelist.some((w) => nf.includes(w))) return false;
  // Anti-divulgation : l'artiste ne doit pas contenir le nom du film.
  const na = norm(artist);
  if (na && (na.includes(nf) || nf.includes(na))) return false;
  return true;
}

// Compilation officielle Disney : les titres y portent le marqueur VF
// 'De "Le Livre de la Jungle"' (les versions anglaises portent 'From "…"').
const FR_MARK = /\(De\s+["“«]([^"”»]+)["”»]/;
const EN_MARK = /\(From\s+["“«]/i;

async function addTrustedCompilations(pool, whitelist) {
  const albumIds = new Set();
  for (const q of TRUSTED_ALBUM_QUERIES) {
    try {
      const s = await dz(`/search/album?q=${encodeURIComponent(q)}&limit=10`);
      for (const a of s?.data || []) {
        if (a?.id && TRUSTED_ALBUM_TITLE.test(a.title || "")) albumIds.add(a.id);
      }
    } catch {
      // requête suivante
    }
  }

  for (const id of albumIds) {
    let tracks = [];
    try {
      const body = await dz(`/album/${id}/tracks?limit=200`);
      tracks = body?.data || [];
    } catch {
      continue;
    }
    for (const t of tracks) {
      const title = t?.title || "";
      const m = title.match(FR_MARK);
      if (!m || EN_MARK.test(title)) continue; // version anglaise ou sans marqueur
      const filmName = frenchFilmName(m[1].trim());
      if (!acceptDisneyTrack(t, filmName, whitelist)) continue;
      pool.push({ ...t, filmName: canonicalFilmName(filmName) });
    }
  }
}

let disneyCache = null;
let disneyCacheAt = 0;

async function buildDisneyPool() {
  if (disneyCache && Date.now() - disneyCacheAt < 6 * 60 * 60 * 1000) {
    return disneyCache;
  }
  const whitelist = DISNEY_FILMS.map(norm);
  const pool = [];

  // Recherches par paquets de 4, espacées : Deezer limite le débit et rejette
  // silencieusement les requêtes au-delà (on perdait des films entiers).
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const searchFilm = async (f) => {
    const url = `/search?q=${encodeURIComponent(f + " bande originale française")}&limit=25`;
    try {
      return await dz(url);
    } catch {
      await sleep(600); // seconde chance après une limite de débit
      return dz(url).catch(() => null);
    }
  };

  for (let i = 0; i < DISNEY_FILMS.length; i += 4) {
    const batch = DISNEY_FILMS.slice(i, i + 4);
    if (i > 0) await sleep(250);
    const results = await Promise.all(batch.map(searchFilm));
    for (const s of results) {
      for (const t of s?.data || []) {
        const title = t?.title || "";
        const album = t?.album?.title || "";
        // VF officielle (marqueur dans le titre OU l'album)
        if (
          !FILM_THEMES.disney.albumRequired.test(title) &&
          !FILM_THEMES.disney.albumRequired.test(album)
        )
          continue;
        if (COVER_ALBUM.test(album) || COVER_ALBUM.test(title)) continue;
        const filmName = frenchFilmName(extractFilm(album, title));
        if (!acceptDisneyTrack(t, filmName, whitelist)) continue;
        pool.push({ ...t, filmName: canonicalFilmName(filmName) });
      }
    }
  }

  // Complète avec les compilations officielles (classiques absents des BO).
  await addTrustedCompilations(pool, whitelist);

  // Les plus populaires d'abord, plafond par film pour garder de la variété.
  pool.sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
  const seenTitles = new Set();
  const perFilm = new Map();
  const final = [];
  for (const t of pool) {
    const tk = norm(t.title.replace(/\(.*?\)/g, ""));
    const fk = norm(t.filmName.replace(/\(.*?\)/g, ""));
    if (!tk || seenTitles.has(tk)) continue;
    if ((perFilm.get(fk) || 0) >= MAX_PER_FILM) continue;
    seenTitles.add(tk);
    perFilm.set(fk, (perFilm.get(fk) || 0) + 1);
    final.push(t);
  }

  const pool150 = final.slice(0, POOL_TARGET);
  if (pool150.length) {
    disneyCache = pool150;
    disneyCacheAt = Date.now();
  }
  return pool150;
}

// Playlists Deezer vérifiées le 13/06/2026 (toutes avec ≥58 extraits jouables
// et une bonne variété d'artistes). En cas de pépin, une recherche prend le
// relais via `query`.
const THEMES = {
  "70s": { label: "Années 70", playlistId: 13700409161, query: "disco funk 70s" },
  "80s": { label: "Années 80", playlistId: 96821901, query: "tubes années 80" },
  "90s": { label: "Années 90", playlistId: 1251125011, query: "hits années 90" },
  "2000s": { label: "Années 2000", playlistId: 248297032, query: "hits années 2000" },
  "2010s": { label: "Années 2010", playlistId: 15371784023, query: "tubes 2010s" },
  pop: { label: "Pop", playlistId: 1479458365, query: "pop hits" },
  rock: { label: "Rock", playlistId: 1306931615, query: "rock classics" },
  metal: { label: "Metal", playlistId: 61217294, query: "heavy metal hits" },
  rapfr: { label: "Rap FR", playlistId: 1071669561, query: "rap français" },
  varietefr: { label: "Variété FR", playlistId: 1420459465, query: "variété française" },
  karaoke: { label: "Karaoké FR", playlistId: 7064556104, query: "karaoké français" },
  disney: { label: "Disney", playlistId: 1032758771, query: "disney français" },
  films: { label: "Films & Séries", playlistId: 8531512122, query: "musiques de films cultes" },
  electro: { label: "Électro", playlistId: 7188387004, query: "electro dance hits" },
  latino: { label: "Latino", playlistId: 10399915842, query: "latino reggaeton hits" },
  reggae: { label: "Reggae", playlistId: 8291980982, query: "reggae roots bob marley" },
  kpop: { label: "K-Pop", playlistId: 10730307122, query: "kpop hits" },
  jazz: { label: "Jazz", playlistId: 1615514485, query: "jazz classics" },
};

async function playlistRawTracks(playlistId) {
  const body = await dz(`/playlist/${playlistId}/tracks?limit=100`);
  return body?.data || [];
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const count = Math.min(
    parseInt(searchParams.get("count") || "10", 10) || 10,
    20
  );
  const theme = THEMES[key];
  if (!theme) {
    return NextResponse.json({ error: "unknown_theme" }, { status: 400 });
  }
  // Morceaux déjà joués, à éviter tant que le vivier n'est pas épuisé.
  const played = parseExcluded(searchParams);

  try {
    // 0) Thèmes à 3 champs (Disney, Films) : versions officielles uniquement.
    const filmConf = FILM_THEMES[key];
    if (filmConf) {
      try {
        // Disney : recherche film par film (bien plus de films couverts).
        const pool =
          key === "disney"
            ? await buildDisneyPool()
            : await buildFilmPool(filmConf, count);
        // 3 morceaux par film au plus dans une même partie, pour varier les
        // films devinés (on privilégie les films encore non joués).
        const perFilm = new Map();
        const playedSet = new Set(played);
        const varied = [...pool]
          .sort((a, b) => {
            const pa = playedSet.has(String(a.id)) ? 1 : 0;
            const pb = playedSet.has(String(b.id)) ? 1 : 0;
            return pa - pb;
          })
          .filter((t) => {
            const k = t.filmName.toLowerCase();
            const n = perFilm.get(k) || 0;
            if (n >= 3) return false;
            perFilm.set(k, n + 1);
            return true;
          });
        const { tracks, exhausted } = pickAvoidingPlayed(
          varied,
          count,
          played,
          Infinity
        );
        if (tracks.length >= Math.min(count, 5)) {
          return NextResponse.json({ tracks, exhausted });
        }
      } catch {
        // on retombe sur le mode classique ci-dessous
      }
    }

    // 1) Playlist vérifiée du thème.
    try {
      const { tracks, exhausted } = pickAvoidingPlayed(
        await playlistRawTracks(theme.playlistId),
        count,
        played
      );
      if (tracks.length >= Math.min(count, 5)) {
        return NextResponse.json({ tracks, exhausted });
      }
    } catch {
      // on passe à la recherche
    }

    // 2) Secours : on cherche une autre playlist du même thème.
    const search = await dz(
      `/search/playlist?q=${encodeURIComponent(theme.query)}&limit=5`
    );
    for (const p of search?.data || []) {
      try {
        const { tracks, exhausted } = pickAvoidingPlayed(
          await playlistRawTracks(p.id),
          count,
          played
        );
        if (tracks.length >= Math.min(count, 5)) {
          return NextResponse.json({ tracks, exhausted });
        }
      } catch {
        // playlist suivante
      }
    }
    return NextResponse.json(
      { error: "Impossible de générer ce thème. Réessaie dans un instant." },
      { status: 502 }
    );
  } catch {
    return NextResponse.json(
      { error: "Deezer ne répond pas. Vérifie ta connexion internet." },
      { status: 502 }
    );
  }
}
