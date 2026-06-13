"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isCorrectAnswer } from "@/lib/normalize";
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
const FULL_POINTS_SECONDS = 6; // fenêtre où la réponse vaut le maximum

// Facteur de rapidité (1 à 10) : plein pendant 6 s, puis -1 cran toutes les 3 s.
function speedFactor(elapsedSeconds) {
  if (elapsedSeconds < FULL_POINTS_SECONDS) return 10;
  const p = 10 - 1 - Math.floor((elapsedSeconds - FULL_POINTS_SECONDS) / 3);
  return Math.max(1, Math.min(10, p));
}

// Points gagnés pour une partie (titre ou artiste) selon la rapidité.
function partPoints(elapsedSeconds, partMax) {
  return Math.max(1, Math.round((speedFactor(elapsedSeconds) / 10) * partMax));
}

export default function GameClient() {
  const router = useRouter();
  const params = useSearchParams();
  const themeKey = params.get("theme");
  const artistId = params.get("artist");
  const playlistId = params.get("playlist");
  const playlistName = params.get("name") || "Blindtest";
  const replayQuery = params.toString();
  // Mode "titre seul" : pour les playlists d'un seul artiste, on ne cherche
  // que le titre, qui vaut alors la totalité des points.
  const titleOnly = params.get("mode") === "title";
  const titlePointsMax = titleOnly ? MAX_POINTS : POINTS_TITLE;

  // phase : loading -> ready -> transition -> playing -> reveal -> (boucle) -> /results
  const [phase, setPhase] = useState("loading");
  const [tracks, setTracks] = useState(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [countdown, setCountdown] = useState(TRANSITION_SECONDS);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(false);
  const [good, setGood] = useState(""); // message vert quand une partie est trouvée
  const [foundTitle, setFoundTitle] = useState(false);
  const [foundArtist, setFoundArtist] = useState(false);
  const [lastResult, setLastResult] = useState(null); // "both" | "title" | "artist" | "none"
  const [lastPoints, setLastPoints] = useState(0);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const resultsRef = useRef([]);
  const inputRef = useRef(null);
  const roundEndedRef = useRef(false);
  const roundStartRef = useRef(0);
  const volumeRef = useRef(0.85);
  // Source de vérité de la manche, lisible depuis le timer :
  const roundRef = useRef({ title: false, artist: false, points: 0 });

  function fail(message) {
    setError(message);
    setPhase("error");
  }

  // ---- Chargement des morceaux ----
  useEffect(() => {
    const url = themeKey
      ? `/api/deezer/theme-tracks?key=${themeKey}&count=${NB_TRACKS}`
      : artistId
        ? `/api/deezer/artist-tracks?id=${artistId}&count=${NB_TRACKS}`
        : playlistId
          ? `/api/deezer/playlist-tracks?id=${playlistId}&count=${NB_TRACKS}`
          : null;
    if (!url) {
      fail("Aucun blindtest sélectionné.");
      return;
    }
    fetch(url)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Impossible de charger les chansons.");
        return d;
      })
      .then((d) => {
        if (!d.tracks?.length)
          throw new Error("Pas d'extraits jouables pour cette sélection.");
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
    // Lecture muette immédiate pendant le clic : débloque l'audio pour la suite.
    audio.play().catch(() => {});
    audio.pause();
    resultsRef.current = [];
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
          roundRef.current = { title: false, artist: false, points: 0 };
          setFoundTitle(false);
          setFoundArtist(false);
          setGood("");
          setWrong(false);
          setAnswer("");
          setLastResult(null);
          setTimeLeft(ROUND_SECONDS);
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
      foundTitle: r.title,
      foundArtist: r.artist,
      points: r.points,
    });
    setLastPoints(r.points);
    setLastResult(
      titleOnly
        ? r.title
          ? "both"
          : "none"
        : r.title && r.artist
          ? "both"
          : r.title
            ? "title"
            : r.artist
              ? "artist"
              : "none"
    );
    setPhase("reveal");
  }

  // ---- Timer de 20 secondes ----
  useEffect(() => {
    if (phase !== "playing") return;
    inputRef.current?.focus();
    const started = Date.now();
    const int = setInterval(() => {
      const left = ROUND_SECONDS - (Date.now() - started) / 1000;
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
        sessionStorage.setItem(
          "blindtest-results",
          JSON.stringify({
            replayQuery,
            playlistName,
            total: tracks.length,
            titleOnly,
            titlesFound: items.filter((i) => i.foundTitle).length,
            artistsFound: items.filter((i) => i.foundArtist).length,
            score: items.reduce((sum, i) => sum + (i.points || 0), 0),
            maxPoints: tracks.length * MAX_POINTS,
            items,
          })
        );
        router.push("/results");
      } else {
        setRoundIndex((i) => i + 1);
        setPhase("transition");
      }
    }, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lastResult, roundIndex, tracks]);

  // ---- Soumission d'une réponse (titre et/ou artiste) ----
  function handleSubmit(e) {
    e.preventDefault();
    if (phase !== "playing" || !answer.trim()) return;
    const track = tracks[roundIndex];
    const r = roundRef.current;
    const elapsed = (Date.now() - roundStartRef.current) / 1000;

    let gained = 0;
    const parts = [];
    if (
      !r.title &&
      (isCorrectAnswer(answer, track.matchName || track.name) ||
        isCorrectAnswer(answer, track.name))
    ) {
      const pts = partPoints(elapsed, titlePointsMax);
      r.title = true;
      r.points += pts;
      gained += pts;
      parts.push(`🎵 Titre +${pts}`);
      setFoundTitle(true);
    }
    if (!titleOnly && !r.artist && isCorrectAnswer(answer, track.artists)) {
      const pts = partPoints(elapsed, POINTS_ARTIST);
      r.artist = true;
      r.points += pts;
      gained += pts;
      parts.push(`🎤 Artiste +${pts}`);
      setFoundArtist(true);
    }

    if (gained > 0) {
      setScore((s) => s + gained);
      setAnswer("");
      setWrong(false);
      if (titleOnly ? r.title : r.title && r.artist) {
        finishRound();
      } else {
        setGood(`${parts.join("  ·  ")} — trouve l'autre !`);
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
  const progress = (timeLeft / ROUND_SECONDS) * 100;
  const barColor =
    timeLeft > 15 ? "bg-jenny" : timeLeft > 7 ? "bg-yellow-400" : "bg-red-500";
  const elapsedNow = ROUND_SECONDS - timeLeft;
  const titlePotential = partPoints(elapsedNow, titlePointsMax);
  const artistPotential = partPoints(elapsedNow, POINTS_ARTIST);

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
            {tracks.length} extraits · {ROUND_SECONDS} secondes par titre
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
        <span className="whitespace-nowrap">
          Score : <span className="text-jenny">{score}</span>
        </span>
      </div>

      {/* Réglage du volume pendant la partie */}
      <div className="mt-3 flex w-full max-w-3xl items-center gap-2">
        <VolumeSlider className="w-full" onChange={handleVolumeChange} />
      </div>

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
                {titleOnly ? "Devine le titre" : "Devine le titre et l'artiste"}
              </p>
            </div>

            {/* Indicateurs titre / artiste */}
            <div className="flex w-full justify-center gap-4">
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
              {!titleOnly && (
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
                    ? titleOnly
                      ? "✅ Bonne réponse !"
                      : "✅ Titre + artiste !"
                    : lastResult === "title"
                      ? "🎵 Titre trouvé !"
                      : "🎤 Artiste trouvé !"}
                </div>
                {lastResult !== "both" && (
                  <div className="mt-1 text-lg font-semibold text-zinc-400">
                    {lastResult === "title" ? "Artiste manqué" : "Titre manqué"}
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
              : titleOnly
                ? "Tape le titre de la chanson…"
                : foundTitle
                  ? "Trouve l'artiste…"
                  : foundArtist
                    ? "Trouve le titre…"
                    : "Tape le titre ou l'artiste…"
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
