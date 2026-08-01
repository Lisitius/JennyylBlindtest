// Moteur des parties multijoueur.
// Règle d'or : le serveur est l'arbitre. Le navigateur ne connaît jamais les
// réponses avant la révélation et ne calcule jamais les points.
import { db } from "@/lib/supabase";
import { isCorrectAnswer, isCorrectFilmAnswer } from "@/lib/normalize";

export const REVEAL_MS = 5000; // durée de la révélation avant enchaînement auto
export const DECOMPTE_MS = 4000; // décompte visible avant chaque chanson
const INACTIVITE_MS = 10 * 60 * 1000; // salon supprimé après 10 min sans activité
const MAX_POINTS = 10;
const FULL_POINTS_SECONDS = 6;

// Lettres sans ambiguïté (pas de O/0, I/1) : le code est lu à l'oral en stream.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function genererCode(longueur = 6) {
  let c = "";
  for (let i = 0; i < longueur; i++) {
    c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return c;
}

// --- Barème : identique au mode solo ---
function facteurRapidite(secondes) {
  if (secondes < FULL_POINTS_SECONDS) return 10;
  return Math.max(1, Math.min(10, 10 - 1 - Math.floor((secondes - FULL_POINTS_SECONDS) / 3)));
}

function pointsPartie(secondes, maxPartie) {
  return Math.max(1, Math.round((facteurRapidite(secondes) / 10) * maxPartie));
}

// Répartition des 10 points selon les champs à deviner.
export function repartition({ titre, artiste, film }) {
  const n = [titre, artiste, film].filter(Boolean).length;
  if (n <= 1)
    return {
      titre: titre ? MAX_POINTS : 0,
      artiste: artiste ? MAX_POINTS : 0,
      film: film ? MAX_POINTS : 0,
    };
  if (n === 2)
    return {
      titre: titre ? 5 : 0,
      artiste: artiste ? 5 : 0,
      film: film ? 5 : 0,
    };
  return { titre: 4, artiste: 3, film: 3 };
}

// Quels champs sont à deviner, selon le mode et le morceau.
export function champsADeviner(mode, morceau) {
  const avecFilm = Boolean(morceau?.film) && mode !== "title";
  return {
    titre: mode !== "film",
    artiste: mode === "full",
    film: avecFilm && mode !== "title",
  };
}

// --- Ménage automatique ---
// Un salon est "actif" si un joueur y a consulté l'état récemment. Sans tâche
// de fond, ce nettoyage est déclenché à la création d'un salon : c'est assez
// fréquent pour éviter l'accumulation, et assez rare pour ne rien ralentir.
export async function nettoyerSalonsInactifs() {
  const limite = new Date(Date.now() - INACTIVITE_MS).toISOString();
  try {
    const candidats = await db(
      `/rooms?updated_at=lt.${limite}&select=id`
    );
    const ids = (Array.isArray(candidats.body) ? candidats.body : []).map((r) => r.id);
    if (!ids.length) return 0;

    // On épargne les salons où quelqu'un est encore présent.
    const presents = await db(
      `/room_players?last_seen=gt.${limite}&select=room_id`
    );
    const actifs = new Set(
      (Array.isArray(presents.body) ? presents.body : []).map((p) => p.room_id)
    );

    const aSupprimer = ids.filter((id) => !actifs.has(id));
    if (!aSupprimer.length) return 0;

    // Les joueurs et les réponses partent avec le salon (suppression en cascade).
    await db(`/rooms?id=in.(${aSupprimer.join(",")})`, { method: "DELETE" });
    return aSupprimer.length;
  } catch {
    return 0; // le ménage ne doit jamais empêcher de jouer
  }
}

// --- Accès aux salons ---
export async function salonParCode(code) {
  const r = await db(`/rooms?code=eq.${encodeURIComponent(code)}&select=*`);
  return Array.isArray(r.body) ? r.body[0] || null : null;
}

export async function joueursDuSalon(roomId) {
  const r = await db(
    `/room_players?room_id=eq.${roomId}&kicked=eq.false&select=user_id,pseudo,score,found,last_seen&order=score.desc`
  );
  return Array.isArray(r.body) ? r.body : [];
}

async function majSalon(roomId, champs) {
  return db(`/rooms?id=eq.${roomId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...champs, updated_at: new Date().toISOString() }),
  });
}

// Prépare la manche suivante (ou termine la partie).
export async function lancerManche(salon, indice) {
  const total = (salon.tracks || []).length;
  if (indice >= total) {
    await majSalon(salon.id, { status: "ended", round_index: total });
    return { ...salon, status: "ended", round_index: total };
  }
  const duree = (salon.settings?.roundSeconds || 30) * 1000;
  const debut = Date.now() + DECOMPTE_MS; // décompte avant que la musique parte
  const champs = {
    status: "playing",
    round_index: indice,
    round_started_at: new Date(debut).toISOString(),
    round_ends_at: new Date(debut + duree).toISOString(),
    reveal_until: null,
  };
  await majSalon(salon.id, champs);
  // Remise à zéro de ce que chacun a trouvé
  await db(`/room_players?room_id=eq.${salon.id}`, {
    method: "PATCH",
    body: JSON.stringify({ found: {} }),
  });
  return { ...salon, ...champs };
}

// Fait avancer l'état si le temps l'impose (appelé à chaque lecture d'état).
// Sans tâche de fond, c'est la lecture qui fait progresser la partie.
export async function avancerSiNecessaire(salon) {
  const maintenant = Date.now();

  if (salon.status === "playing" && salon.round_ends_at) {
    if (maintenant > new Date(salon.round_ends_at).getTime()) {
      const champs = {
        status: "reveal",
        reveal_until: new Date(maintenant + REVEAL_MS).toISOString(),
      };
      await majSalon(salon.id, champs);
      return { ...salon, ...champs };
    }
  }

  // En révélation : on n'enchaîne QUE si l'enchaînement automatique est activé.
  // Sinon on attend que l'animatrice clique sur "Chanson suivante".
  if (salon.status === "reveal" && salon.auto_next && salon.reveal_until) {
    if (maintenant > new Date(salon.reveal_until).getTime()) {
      return lancerManche(salon, salon.round_index + 1);
    }
  }

  return salon;
}

// --- Vue envoyée au navigateur ---
// Filtre essentiel : le titre, l'artiste et le film ne sortent qu'à la
// révélation (ou pour l'animatrice si elle a demandé à voir).
export function vuePublique(salon, morceau, { estHote, revele }) {
  const enRevelation = salon.status === "reveal" || salon.status === "ended";
  const montrerReponse = enRevelation || (estHote && revele);
  if (!morceau) return null;
  return {
    // Le son passe par notre serveur : le lien ne trahit pas la chanson.
    audio: `/api/rooms/audio/${salon.code}/${salon.round_index}`,
    image: enRevelation ? morceau.image : null,
    ...(montrerReponse
      ? { name: morceau.name, artists: morceau.artists, film: morceau.film || null }
      : {}),
  };
}

// --- Traitement d'une réponse ---
export async function traiterReponse(salon, joueur, texte) {
  const morceau = (salon.tracks || [])[salon.round_index];
  if (!morceau) return { accepte: false, raison: "hors_manche" };
  if (salon.status !== "playing") return { accepte: false, raison: "hors_manche" };

  const fin = new Date(salon.round_ends_at).getTime();
  const debut = new Date(salon.round_started_at).getTime();
  const maintenant = Date.now();
  if (maintenant > fin || maintenant < debut)
    return { accepte: false, raison: "hors_manche" };

  const mode = salon.settings?.mode || "full";
  const champs = champsADeviner(mode, morceau);
  const bareme = repartition(champs);
  const trouve = joueur.found || {};
  const secondes = (maintenant - debut) / 1000;

  let gagnes = 0;
  const parties = [];

  if (champs.titre && !trouve.titre) {
    if (
      isCorrectAnswer(texte, morceau.matchName || morceau.name) ||
      isCorrectAnswer(texte, morceau.name)
    ) {
      const p = pointsPartie(secondes, bareme.titre);
      trouve.titre = true;
      gagnes += p;
      parties.push({ partie: "titre", points: p });
    }
  }
  if (champs.artiste && !trouve.artiste) {
    if (isCorrectAnswer(texte, morceau.artists)) {
      const p = pointsPartie(secondes, bareme.artiste);
      trouve.artiste = true;
      gagnes += p;
      parties.push({ partie: "artiste", points: p });
    }
  }
  if (champs.film && !trouve.film) {
    if (
      isCorrectFilmAnswer(texte, morceau.film) ||
      (morceau.filmAlt && isCorrectFilmAnswer(texte, morceau.filmAlt))
    ) {
      const p = pointsPartie(secondes, bareme.film);
      trouve.film = true;
      gagnes += p;
      parties.push({ partie: "film", points: p });
    }
  }

  if (gagnes > 0) {
    await db(
      `/room_players?room_id=eq.${salon.id}&user_id=eq.${joueur.user_id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ score: (joueur.score || 0) + gagnes, found: trouve }),
      }
    );
  }

  // Trace : sert au classement et surtout à la validation manuelle.
  await db("/room_answers", {
    method: "POST",
    body: JSON.stringify({
      room_id: salon.id,
      round_index: salon.round_index,
      user_id: joueur.user_id,
      pseudo: joueur.pseudo,
      texte: String(texte).slice(0, 120),
      accepte: gagnes > 0,
      partie: parties.map((p) => p.partie).join("+") || "aucune",
      points: gagnes,
    }),
  });

  return { accepte: gagnes > 0, gagnes, parties, trouve };
}
