"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isCorrectAnswer, isCorrectFilmAnswer } from "@/lib/normalize";
import VolumeSlider, { getStoredVolume } from "@/components/VolumeSlider";

const ROUND_SECONDS = 30;
const TRANSITION_SECONDS = 5;
const FIRST_TRANSITION_SECONDS = 3;
const REVEAL_CORRECT_MS = 2000;
const REVEAL_TIMEOUT_MS = 4000;
const NB_TRACKS = 10;
const POINTS_TITLE = 5; // points max pour le titre
const POINTS_ARTIST = 5; // points max pour l'artiste
const MAX_POINTS = POINTS_TITLE + POINTS_ARTIST; // total par titre (10)
// Facteur de rapidité (1 à 10), proportionnel à la durée de la manche : les
// points restent au maximum pendant le premier cinquième du temps, puis
// diminuent régulièrement jusqu'au minimum à la fin. Le rythme est ainsi le
// même en 15, 20, 30 ou 45 secondes.
function speedFactor(elapsedSeconds, duree = 30) {
  const d = duree > 0 ? duree : 30;
  const repit = d * 0.2;
  if (elapsedSeconds <= repit) return 10;
  const avancement = Math.min(1, (elapsedSeconds - repit) / (d - repit));
  return Math.max(1, Math.round(10 - avancement * 9));
}

// --- Mémoire des morceaux déjà joués (par source de blindtest) ---
// Évite de retomber sur les mêmes chansons avant d'avoir épuisé le vivier.
const PLAYED_LIMIT = 400;

function playedKey(source) {
  return `blindtest-played:${source}`;
}

function getPlayed(source) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(playedKey(source));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

function savePlayed(source, ids) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      playedKey(source),
      JSON.stringify(ids.slice(-PLAYED_LIMIT))
    );
  } catch {
    // stockage indisponible : on joue simplement sans mémoire
  }
}

// Points gagnés pour une partie (titre, artiste ou film) selon la rapidité.
function partPoints(elapsedSeconds, partMax, duree = 30) {
  if (!partMax) return 0;
  return Math.max(
    1,
    Math.round((speedFactor(elapsedSeconds, duree) / 10) * partMax)
  );
}

// Répartition des 10 points entre les champs à deviner :
// 1 champ = 10 pts, 2 champs = 5/5, 3 champs = 4/3/3.
function pointsSplit({ title, artist, film }) {
  const n = [title, artist, film].filter(Boolean).length;
  if (n <= 1) {
    return {
      title: title ? MAX_POINTS : 0,
      artist: artist ? MAX_POINTS : 0,
      film: film ? MAX_POINTS : 0,
    };
  }
  if (n === 2) {
    return {
      title: title ? POINTS_TITLE : 0,
      artist: artist ? POINTS_ARTIST : 0,
      film: film ? POINTS_ARTIST : 0,
    };
  }
  return { title: 4, artist: 3, film: 3 };
}

export default function GameClient() {
  const router = useRouter();
  const params = useSearchParams();
  const themeKey = params.get("theme");
  const artistId = params.get("artist");
  const playlistId = params.get("playlist");
  const playlistName = params.get("name") || "Blindtest";
  const replayQuery = params.toString();
  // Modes de jeu :
  //  full       = titre + artiste (+ film pour Disney/Films)
  //  title      = titre seul (playlists d'un seul artiste)
  //  title-film = titre + film
  //  film       = film seul
  const mode = params.get("mode") || "full";
  const needTitle = mode !== "film";
  const needArtist = mode === "full";
  const wantFilm = mode !== "title"; // utilisé si le morceau a un film
  // Nombre de musiques choisi (10, 15 ou 20), 10 par défaut.
  const nbTracks = [10, 15, 20].includes(Number(params.get("count")))
    ? Number(params.get("count"))
    : NB_TRACKS;
  // Temps de réponse par chanson (15, 20, 30 ou 45 s).
  const roundSeconds = [15, 20, 30, 45].includes(Number(params.get("time")))
    ? Number(params.get("time"))
    : ROUND_SECONDS;

  // phase : loading -> ready -> transition -> playing -> reveal -> (boucle) -> /results
  const [phase, setPhase] = useState("loading");
  const [tracks, setTracks] = useState(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [countdown, setCountdown] = useState(TRANSITION_SECONDS);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(false);
  const [good, setGood] = useState(""); // message vert quand une partie est trouvée
  const [foundTitle, setFoundTitle] = useState(false);
  const [foundArtist, setFoundArtist] = useState(false);
  const [foundFilm, setFoundFilm] = useState(false);
  const [lastResult, setLastResult] = useState(null); // "both" | "title" | "artist" | "none"
  const [lastPoints, setLastPoints] = useState(0);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]); // manches terminées (affichage)

  const audioRef = useRef(null);
  const resultsRef = useRef([]);
  const inputRef = useRef(null);
  const roundEndedRef = useRef(false);
  const roundStartRef = useRef(0);
  const volumeRef = useRef(0.85);
  // Source de vérité de la manche, lisible depuis le timer :
  const roundRef = useRef({
    title: false,
    artist: false,
    film: false,
    points: 0,
  });

  function fail(message) {
    setError(message);
    setPhase("error");
  }

  // ---- Chargement des morceaux ----
  useEffect(() => {
    const source = themeKey
      ? `theme:${themeKey}`
      : artistId
        ? `artist:${artistId}`
        : playlistId
          ? `playlist:${playlistId}`
          : null;
    const base = themeKey
      ? `/api/deezer/theme-tracks?key=${themeKey}&count=${nbTracks}`
      : artistId
        ? `/api/deezer/artist-tracks?id=${artistId}&count=${nbTracks}`
        : playlistId
          ? `/api/deezer/playlist-tracks?id=${playlistId}&count=${nbTracks}`
          : null;
    if (!base) {
      fail("Aucun blindtest sélectionné.");
      return;
    }
    // On transmet les morceaux déjà joués pour qu'ils ne ressortent pas.
    const already = getPlayed(source);
    const url = already.length
      ? `${base}&exclude=${already.join(",")}`
      : base;

    fetch(url)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Impossible de charger les chansons.");
        return d;
      })
      .then((d) => {
        if (!d.tracks?.length)
          throw new Error("Pas d'extraits jouables pour cette sélection.");
        // Vivier épuisé : on repart d'une mémoire vierge.
        const ids = d.tracks.map((t) => t.id).filter(Boolean);
        savePlayed(source, d.exhausted ? ids : [...already, ...ids]);
        setTracks(d.tracks);
        setPhase("ready");
      })
      .catch((e) => fail(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKey, artistId, playlistId]);

  // ---- Nettoyage du lecteur audio ----
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  // ---- Volume mémorisé (réglé sur la page de choix ou ici) ----
  useEffect(() => {
    volumeRef.current = getStoredVolume();
    if (audioRef.current) audioRef.current.volume = volumeRef.current;
  }, []);

  // ---- Démarrage (le clic autorise le son dans le navigateur) ----
  function handleStart() {
    const audio = new Audio();
    audio.volume = volumeRef.current;
    audioRef.current = audio;
    // Le clic est le seul moment où le navigateur autorise le son. On joue un
    // court silence pour débloquer le lecteur : un lecteur vide ne suffit pas,
    // certains navigateurs refusent ensuite toute lecture.
    audio.src =
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=";
    audio.play()
      .then(() => audio.pause())
      .catch(() => {});
    resultsRef.current = [];
    setHistory([]);
    setScore(0);
    setRoundIndex(0);
    setPhase("transition");
  }

  // ---- Compte à rebours puis lancement de l'extrait ----
  useEffect(() => {
    if (phase !== "transition" || !tracks) return;
    let c = roundIndex === 0 ? FIRST_TRANSITION_SECONDS : TRANSITION_SECONDS;
    setCountdown(c);
    let stopped = false;

    function launchTrack() {
      const track = tracks[roundIndex];
      const audio = audioRef.current;
      if (!audio) return;
      audio.src = track.preview;
      audio
        .play()
        .then(() => {
          if (stopped) {
            audio.pause();
            return;
          }
          roundEndedRef.current = false;
          roundStartRef.current = Date.now();
          roundRef.current = {
            title: false,
            artist: false,
            film: false,
            points: 0,
          };
          setFoundTitle(false);
          setFoundArtist(false);
          setFoundFilm(false);
          setGood("");
          setWrong(false);
          setAnswer("");
          setLastResult(null);
          setTimeLeft(roundSeconds);
          setPhase("playing");
        })
        .catch(() => {
          if (!stopped)
            fail(
              "Le navigateur a bloqué le son. Recharge la page et réessaie."
            );
        });
    }

    const int = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(int);
        launchTrack();
      }
    }, 1000);

    return () => {
      stopped = true;
      clearInterval(int);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIndex, tracks]);

  // ---- Quitter la partie en cours ----
  function handleQuit() {
    audioRef.current?.pause();
    router.push("/playlists");
  }

  // ---- Réglage du volume (appliqué en direct au lecteur) ----
  function handleVolumeChange(v) {
    volumeRef.current = v;
    if (audioRef.current) audioRef.current.volume = v;
  }

  // ---- Fin de manche (les deux trouvés ou temps écoulé) ----
  // Les points sont déjà ajoutés au fur et à mesure dans handleSubmit.
  function finishRound() {
    if (roundEndedRef.current) return;
    roundEndedRef.current = true;
    audioRef.current?.pause();
    const track = tracks[roundIndex];
    const r = roundRef.current;
    resultsRef.current.push({
      name: track.name,
      artists: track.artists,
      image: track.image,
      film: track.film || null,
      foundTitle: r.title,
      foundArtist: needArtist && r.artist,
      foundFilm: Boolean(track.film) && wantFilm && r.film,
      points: r.points,
    });
    setHistory([...resultsRef.current]);
    setLastPoints(r.points);
    // "both" = tout trouvé, "partial" = une partie seulement, "none" = rien.
    const needed = [];
    if (needTitle) needed.push(r.title);
    if (needArtist) needed.push(r.artist);
    if (wantFilm && track.film) needed.push(r.film);
    setLastResult(
      needed.every(Boolean) ? "both" : needed.some(Boolean) ? "partial" : "none"
    );
    setPhase("reveal");
  }

  // ---- Timer de 20 secondes ----
  useEffect(() => {
    if (phase !== "playing") return;
    inputRef.current?.focus();
    const started = Date.now();
    const int = setInterval(() => {
      const left = roundSeconds - (Date.now() - started) / 1000;
      if (left <= 0) {
        clearInterval(int);
        setTimeLeft(0);
        finishRound();
      } else {
        setTimeLeft(left);
      }
    }, 100);
    return () => clearInterval(int);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIndex]);

  // ---- Affichage de la réponse puis manche suivante / résultats ----
  useEffect(() => {
    if (phase !== "reveal" || !tracks) return;
    const ms = lastResult === "both" ? REVEAL_CORRECT_MS : REVEAL_TIMEOUT_MS;
    const t = setTimeout(() => {
      if (roundIndex + 1 >= tracks.length) {
        const items = resultsRef.current;
        const bilan = {
          replayQuery,
          playlistName,
          total: tracks.length,
          mode,
          showTitle: needTitle,
          showArtist: needArtist,
          titlesFound: items.filter((i) => i.foundTitle).length,
          artistsFound: items.filter((i) => i.foundArtist).length,
          hasFilm: items.some((i) => i.film),
          filmsFound: items.filter((i) => i.foundFilm).length,
          score: items.reduce((sum, i) => sum + (i.points || 0), 0),
          maxPoints: tracks.length * MAX_POINTS,
          items,
        };
        sessionStorage.setItem("blindtest-results", JSON.stringify(bilan));

        // Enregistrement dans l'historique du joueur connecté.
        // Sans compte, la requête est simplement ignorée par le serveur.
        fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: themeKey
              ? `theme:${themeKey}`
              : artistId
                ? `artist:${artistId}`
                : `playlist:${playlistId}`,
            sourceName: playlistName,
            mode,
            nbTracks: tracks.length,
            roundSeconds,
            score: bilan.score,
            maxPoints: bilan.maxPoints,
            titlesFound: bilan.titlesFound,
            artistsFound: bilan.artistsFound,
            filmsFound: bilan.filmsFound,
            items: items.map((i) => ({
              nom: i.name,
              artiste: i.artists,
              film: i.film || null,
              points: i.points,
            })),
          }),
        }).catch(() => {});

        router.push("/results");
      } else {
        setRoundIndex((i) => i + 1);
        setPhase("transition");
      }
    }, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lastResult, roundIndex, tracks]);

  // ---- Soumission d'une réponse (titre, artiste et/ou film) ----
  function handleSubmit(e) {
    e.preventDefault();
    if (phase !== "playing" || !answer.trim()) return;
    const track = tracks[roundIndex];
    const r = roundRef.current;
    const elapsed = (Date.now() - roundStartRef.current) / 1000;
    const withFilm = Boolean(track.film) && wantFilm;
    const split = pointsSplit({
      title: needTitle,
      artist: needArtist,
      film: withFilm,
    });

    let gained = 0;
    const parts = [];
    if (
      needTitle &&
      !r.title &&
      (isCorrectAnswer(answer, track.matchName || track.name) ||
        isCorrectAnswer(answer, track.name))
    ) {
      const pts = partPoints(elapsed, split.title, roundSeconds);
      r.title = true;
      r.points += pts;
      gained += pts;
      parts.push(`🎵 Titre +${pts}`);
      setFoundTitle(true);
    }
    if (needArtist && !r.artist && isCorrectAnswer(answer, track.artists)) {
      const pts = partPoints(elapsed, split.artist, roundSeconds);
      r.artist = true;
      r.points += pts;
      gained += pts;
      parts.push(`🎤 Artiste +${pts}`);
      setFoundArtist(true);
    }
    // On accepte le titre français comme le titre d'origine (anglais).
    if (
      withFilm &&
      !r.film &&
      (isCorrectFilmAnswer(answer, track.film) ||
        (track.filmAlt && isCorrectFilmAnswer(answer, track.filmAlt)))
    ) {
      const pts = partPoints(elapsed, split.film, roundSeconds);
      r.film = true;
      r.points += pts;
      gained += pts;
      parts.push(`🎬 Film +${pts}`);
      setFoundFilm(true);
    }

    if (gained > 0) {
      setScore((s) => s + gained);
      setAnswer("");
      setWrong(false);
      const allFound =
        (!needTitle || r.title) &&
        (!needArtist || r.artist) &&
        (!withFilm || r.film);
      if (allFound) {
        finishRound();
      } else {
        setGood(`${parts.join("  ·  ")} — continue !`);
        setTimeout(() => setGood(""), 2500);
        inputRef.current?.focus();
      }
    } else {
      setWrong(true);
      setAnswer("");
      setTimeout(() => setWrong(false), 700);
      inputRef.current?.focus();
    }
  }

  const track = tracks?.[roundIndex];
  const progress = (timeLeft / roundSeconds) * 100;
  const barColor =
    timeLeft > roundSeconds * 0.5
      ? "bg-jenny"
      : timeLeft > roundSeconds * 0.25
        ? "bg-yellow-400"
        : "bg-red-500";
  const elapsedNow = roundSeconds - timeLeft;
  const withFilm = Boolean(track?.film) && wantFilm;
  const currentSplit = pointsSplit({
    title: needTitle,
    artist: needArtist,
    film: withFilm,
  });
  const titlePotential = partPoints(elapsedNow, currentSplit.title, roundSeconds);
  const artistPotential = partPoints(elapsedNow, currentSplit.artist, roundSeconds);
  const filmPotential = partPoints(elapsedNow, currentSplit.film, roundSeconds);

  // ---- Vue stream : on publie l'état pour la fenêtre à capturer dans OBS ----
  // Le titre et l'artiste ne sont publiés qu'à la révélation : la fenêtre
  // destinée au direct ne doit jamais afficher la réponse en avance.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (phase === "loading" || phase === "error") return;
    const enRevelation = phase === "reveal";
    const etat = {
      maj: Date.now(),
      phase,
      nom: playlistName,
      manche: roundIndex + 1,
      total: tracks?.length || 0,
      secondes: Math.ceil(timeLeft),
      duree: roundSeconds,
      // Heure de fin absolue : la vue stream calcule le chrono toute seule,
      // même si le navigateur ralentit cet onglet passé en arrière-plan.
      finAbs: phase === "playing" ? Date.now() + timeLeft * 1000 : null,
      score,
      compteARebours: phase === "transition" ? countdown : null,
      champs: { titre: needTitle, artiste: needArtist, film: withFilm },
      trouve: { titre: foundTitle, artiste: foundArtist, film: foundFilm },
      points: { titre: titlePotential, artiste: artistPotential, film: filmPotential },
      resultat: enRevelation ? lastResult : null,
      gagnes: enRevelation ? lastPoints : null,
      morceau:
        enRevelation && track
          ? { nom: track.name, artistes: track.artists, film: track.film || null, image: track.image }
          : null,
      historique: (history || []).slice(-6).map((h) => ({
        nom: h.name,
        artistes: h.artists,
        film: h.film || null,
        points: h.points,
        image: h.image || null,
      })),
    };
    try {
      window.localStorage.setItem("blindtest-solo-stream", JSON.stringify(etat));
    } catch {
      // stockage indisponible : la vue stream ne sera pas alimentée
    }
  }, [
    phase, roundIndex, timeLeft, score, countdown, lastResult, lastPoints,
    foundTitle, foundArtist, foundFilm, track, tracks, history, playlistName,
    roundSeconds, needTitle, needArtist, withFilm,
    titlePotential, artistPotential, filmPotential,
  ]);

  // ================= RENDU =================

  if (phase === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="text-7xl">😵</div>
        <p className="max-w-xl text-2xl font-semibold text-red-300">{error}</p>
        <div className="flex gap-4">
          <button
            onClick={() => router.push("/playlists")}
            className="rounded-full bg-zinc-800 px-8 py-4 text-lg font-bold transition hover:bg-zinc-700"
          >
            ← Choisir un blindtest
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-8 py-4 text-lg font-bold text-white transition hover:brightness-110"
          >
            Réessayer
          </button>
        </div>
      </main>
    );
  }

  if (phase === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-jenny-line border-t-jenny" />
        <p className="text-2xl text-zinc-400">Préparation du blindtest…</p>
      </main>
    );
  }

  if (phase === "ready") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 text-center">
        <div>
          <div className="mb-4 text-7xl">🎵</div>
          <h1 className="text-4xl font-black">{playlistName}</h1>
          <p className="mt-3 text-xl text-zinc-400">
            {tracks.length} extraits · {roundSeconds} secondes par titre
          </p>
        </div>
        <div className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-jenny-surface/60 p-4 ring-1 ring-jenny-line">
          <VolumeSlider className="w-full" onChange={handleVolumeChange} />
        </div>
        <button
          onClick={handleStart}
          className="rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-14 py-6 text-3xl font-black text-white shadow-lg shadow-jenny/40 transition hover:scale-105 hover:brightness-110 animate-pop"
        >
          C'est parti ! 🚀
        </button>
        <p className="max-w-md text-sm text-zinc-500">
          Règle le volume puis monte le son ! 🔊
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-8">
      {/* Barre du haut : quitter + progression + score */}
      <div className="flex w-full max-w-3xl items-center justify-between gap-3 text-xl font-bold text-zinc-300">
        <button
          onClick={handleQuit}
          className="shrink-0 rounded-full bg-zinc-800 px-4 py-2 text-base font-semibold text-zinc-300 transition hover:bg-red-900/70 hover:text-white"
        >
          ✕ Quitter
        </button>
        <span className="whitespace-nowrap">
          Musique{" "}
          <span className="text-white">
            {roundIndex + 1} / {tracks.length}
          </span>
        </span>
        <span className="flex items-center gap-3 whitespace-nowrap">
          <a
            href="/vue-stream"
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvrir l'affichage à capturer dans OBS"
            className="rounded-full bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-zinc-700"
          >
            📺 Vue stream
          </a>
          Score : <span className="text-jenny">{score}</span>
        </span>
      </div>

      {/* Réglage du volume pendant la partie */}
      <div className="mt-3 flex w-full max-w-3xl items-center gap-2">
        <VolumeSlider className="w-full" onChange={handleVolumeChange} />
      </div>

      {/* Historique des morceaux déjà passés */}
      {history.length > 0 && (phase === "transition" || phase === "playing") && (
        <div className="mt-3 w-full max-w-3xl">
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Historique
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[...history].reverse().map((h, i) => (
              <div
                key={history.length - i}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 ring-1 ring-jenny-line"
              >
                {h.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={h.image}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-zinc-800 text-sm">
                    🎵
                  </div>
                )}
                <div className="min-w-0">
                  <div className="max-w-[150px] truncate text-xs font-bold">
                    {h.name}
                  </div>
                  {h.film && (
                    <div className="max-w-[150px] truncate text-[11px] font-semibold text-jenny-light">
                      🎬 {h.film}
                    </div>
                  )}
                  <div className="max-w-[150px] truncate text-[11px] text-zinc-400">
                    {h.artists}
                  </div>
                </div>
                <div
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${
                    h.points > 0
                      ? "bg-jenny text-white"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {h.points > 0 ? `+${h.points}` : "0"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10">
        {phase === "transition" && (
          <div className="text-center animate-fadein">
            <p className="text-2xl text-zinc-400">Prochaine musique dans…</p>
            <div
              key={countdown}
              className="mt-6 text-9xl font-black text-gradient animate-pop"
            >
              {countdown}
            </div>
          </div>
        )}

        {phase === "playing" && (
          <>
            <div className="text-center">
              <div className="text-8xl animate-pulse">🎶</div>
              <p className="mt-4 text-2xl font-bold text-zinc-300">
                {"Devine " +
                  [
                    needTitle && "le titre",
                    needArtist && "l'artiste",
                    withFilm && "le film",
                  ]
                    .filter(Boolean)
                    .join(" et ")}
              </p>
            </div>

            {/* Indicateurs titre / artiste / film */}
            <div className="flex w-full justify-center gap-4">
              {needTitle && (
                <div
                  className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-lg font-bold ring-1 transition ${
                    foundTitle
                      ? "bg-jenny/20 text-jenny-light ring-jenny"
                      : "bg-zinc-900 text-zinc-300 ring-jenny-line"
                  }`}
                >
                  🎵 Titre{" "}
                  {foundTitle ? (
                    <span className="text-jenny-light">✓</span>
                  ) : (
                    <span className="text-jenny">{titlePotential} pts</span>
                  )}
                </div>
              )}
              {needArtist && (
                <div
                  className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-lg font-bold ring-1 transition ${
                    foundArtist
                      ? "bg-jenny/20 text-jenny-light ring-jenny"
                      : "bg-zinc-900 text-zinc-300 ring-jenny-line"
                  }`}
                >
                  🎤 Artiste{" "}
                  {foundArtist ? (
                    <span className="text-jenny-light">✓</span>
                  ) : (
                    <span className="text-jenny">{artistPotential} pts</span>
                  )}
                </div>
              )}
              {withFilm && (
                <div
                  className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-lg font-bold ring-1 transition ${
                    foundFilm
                      ? "bg-jenny/20 text-jenny-light ring-jenny"
                      : "bg-zinc-900 text-zinc-300 ring-jenny-line"
                  }`}
                >
                  🎬 Film{" "}
                  {foundFilm ? (
                    <span className="text-jenny-light">✓</span>
                  ) : (
                    <span className="text-jenny">{filmPotential} pts</span>
                  )}
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="w-full">
              <div className="h-5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${barColor}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-center text-3xl font-black tabular-nums">
                {Math.ceil(timeLeft)}s
              </div>
              <p className="mt-1 text-center text-sm text-zinc-500">
                Plus tu réponds vite, plus tu marques de points
              </p>
            </div>
          </>
        )}

        {phase === "reveal" && track && (
          <div className="flex flex-col items-center gap-6 text-center animate-pop">
            {lastResult === "none" ? (
              <div className="text-5xl font-black text-red-400">
                ⏱️ Temps écoulé !
              </div>
            ) : (
              <div>
                <div className="text-5xl font-black text-jenny">
                  {lastResult === "both"
                    ? [needTitle, needArtist, withFilm].filter(Boolean).length > 1
                      ? "✅ Tout trouvé !"
                      : "✅ Bonne réponse !"
                    : "👍 Presque !"}
                </div>
                {lastResult === "partial" && (
                  <div className="mt-1 text-lg font-semibold text-zinc-400">
                    Il manquait{" "}
                    {[
                      needTitle && !foundTitle && "le titre",
                      needArtist && !foundArtist && "l'artiste",
                      withFilm && !foundFilm && "le film",
                    ]
                      .filter(Boolean)
                      .join(" et ")}
                  </div>
                )}
                <div className="mt-2 text-2xl font-bold text-white">
                  +{lastPoints} point{lastPoints > 1 ? "s" : ""}
                </div>
              </div>
            )}
            {track.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={track.image}
                alt=""
                className="h-52 w-52 rounded-2xl shadow-2xl"
              />
            )}
            <div>
              <div className="text-3xl font-black">{track.name}</div>
              <div className="mt-1 text-xl text-zinc-400">{track.artists}</div>
              {track.film && (
                <div className="mt-1 text-lg font-semibold text-jenny-light">
                  🎬 {track.film}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Barre de réponse — toujours visible, impossible à rater */}
      <form onSubmit={handleSubmit} className="w-full max-w-3xl pb-6">
        {good && (
          <p className="mb-2 text-center text-lg font-bold text-jenny-light animate-fadein">
            {good}
          </p>
        )}
        {wrong && (
          <p className="mb-2 text-center text-lg font-semibold text-red-400 animate-fadein">
            Raté, réessaie !
          </p>
        )}
        <input
          ref={inputRef}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onBlur={(e) => {
            // Ne pas reprendre le focus si l'utilisateur règle le volume.
            if (
              phase === "playing" &&
              !e.relatedTarget?.classList?.contains("volume-range")
            )
              setTimeout(() => inputRef.current?.focus(), 10);
          }}
          disabled={phase !== "playing"}
          placeholder={
            phase !== "playing"
              ? "…"
              : // On liste ce qu'il reste à trouver.
                (() => {
                  const reste = [
                    needTitle && !foundTitle && "le titre",
                    needArtist && !foundArtist && "l'artiste",
                    withFilm && !foundFilm && "le film",
                  ].filter(Boolean);
                  if (!reste.length) return "…";
                  return reste.length === 1
                    ? `Trouve ${reste[0]}…`
                    : `Tape ${reste.join(", ")}…`;
                })()
          }
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`w-full rounded-2xl border-4 bg-zinc-900 px-8 py-6 text-center text-3xl font-bold text-white placeholder-zinc-600 outline-none transition disabled:opacity-40 ${
            wrong
              ? "border-red-500 animate-shake"
              : "border-jenny/50 focus:border-jenny focus:shadow-lg focus:shadow-jenny/40"
          }`}
        />
      </form>
    </main>
  );
}
