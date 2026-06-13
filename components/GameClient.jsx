"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isCorrectAnswer } from "@/lib/normalize";

const ROUND_SECONDS = 30;
const TRANSITION_SECONDS = 5;
const FIRST_TRANSITION_SECONDS = 3;
const REVEAL_CORRECT_MS = 2000;
const REVEAL_TIMEOUT_MS = 4000;
const NB_TRACKS = 10;
const MAX_POINTS = 10;

// Points selon la rapidité : 10 max, puis -1 par tranche de 3 s, minimum 1.
function pointsForElapsed(elapsedSeconds) {
  const p = MAX_POINTS - Math.floor(elapsedSeconds / 3);
  return Math.max(1, Math.min(MAX_POINTS, p));
}

export default function GameClient() {
  const router = useRouter();
  const params = useSearchParams();
  const themeKey = params.get("theme");
  const artistId = params.get("artist");
  const playlistId = params.get("playlist");
  const playlistName = params.get("name") || "Blindtest";
  const replayQuery = params.toString();

  // phase : loading -> ready -> transition -> playing -> reveal -> (boucle) -> /results
  const [phase, setPhase] = useState("loading");
  const [tracks, setTracks] = useState(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [countdown, setCountdown] = useState(TRANSITION_SECONDS);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(false);
  const [lastResult, setLastResult] = useState(null); // "correct" | "timeout"
  const [lastPoints, setLastPoints] = useState(0);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const resultsRef = useRef([]);
  const inputRef = useRef(null);
  const roundEndedRef = useRef(false);
  const roundStartRef = useRef(0);

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

  // ---- Démarrage (le clic autorise le son dans le navigateur) ----
  function handleStart() {
    const audio = new Audio();
    audio.volume = 0.85;
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

  // ---- Fin de manche (bonne réponse ou temps écoulé) ----
  function endRound(found, points = 0) {
    if (roundEndedRef.current) return;
    roundEndedRef.current = true;
    audioRef.current?.pause();
    const track = tracks[roundIndex];
    const earned = found ? points : 0;
    resultsRef.current.push({
      name: track.name,
      artists: track.artists,
      image: track.image,
      found,
      points: earned,
    });
    if (earned) setScore((s) => s + earned);
    setLastPoints(earned);
    setLastResult(found ? "correct" : "timeout");
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
        endRound(false, 0);
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
    const ms = lastResult === "correct" ? REVEAL_CORRECT_MS : REVEAL_TIMEOUT_MS;
    const t = setTimeout(() => {
      if (roundIndex + 1 >= tracks.length) {
        const items = resultsRef.current;
        sessionStorage.setItem(
          "blindtest-results",
          JSON.stringify({
            replayQuery,
            playlistName,
            total: tracks.length,
            foundCount: items.filter((i) => i.found).length,
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

  // ---- Soumission d'une réponse ----
  function handleSubmit(e) {
    e.preventDefault();
    if (phase !== "playing" || !answer.trim()) return;
    const track = tracks[roundIndex];
    if (
      isCorrectAnswer(answer, track.matchName || track.name) ||
      isCorrectAnswer(answer, track.name)
    ) {
      const elapsed = (Date.now() - roundStartRef.current) / 1000;
      endRound(true, pointsForElapsed(elapsed));
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
    timeLeft > 15 ? "bg-spotify" : timeLeft > 7 ? "bg-yellow-400" : "bg-red-500";
  const potentialPoints = pointsForElapsed(ROUND_SECONDS - timeLeft);

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
            className="rounded-full bg-spotify px-8 py-4 text-lg font-bold text-black transition hover:brightness-110"
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
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-700 border-t-spotify" />
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
        <button
          onClick={handleStart}
          className="rounded-full bg-spotify px-14 py-6 text-3xl font-black text-black transition hover:scale-105 hover:brightness-110 animate-pop"
        >
          C'est parti ! 🚀
        </button>
        <p className="max-w-md text-sm text-zinc-500">
          Monte le son ! 🔊
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
          Score : <span className="text-spotify">{score}</span>
        </span>
      </div>

      <div className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10">
        {phase === "transition" && (
          <div className="text-center animate-fadein">
            <p className="text-2xl text-zinc-400">Prochaine musique dans…</p>
            <div
              key={countdown}
              className="mt-6 text-9xl font-black text-spotify animate-pop"
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
                Quel est ce titre ?
              </p>
            </div>

            {/* Timer */}
            <div className="w-full">
              <div className="h-5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${barColor}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-center gap-4">
                <span className="text-3xl font-black tabular-nums">
                  {Math.ceil(timeLeft)}s
                </span>
                <span className="rounded-full bg-zinc-800 px-4 py-1 text-lg font-bold text-spotify">
                  Vaut {potentialPoints} pt{potentialPoints > 1 ? "s" : ""}
                </span>
              </div>
              <p className="mt-1 text-center text-sm text-zinc-500">
                Plus tu réponds vite, plus tu marques de points
              </p>
            </div>
          </>
        )}

        {phase === "reveal" && track && (
          <div className="flex flex-col items-center gap-6 text-center animate-pop">
            {lastResult === "correct" ? (
              <div>
                <div className="text-5xl font-black text-spotify">
                  ✅ Bonne réponse !
                </div>
                <div className="mt-2 text-2xl font-bold text-white">
                  +{lastPoints} point{lastPoints > 1 ? "s" : ""}
                </div>
              </div>
            ) : (
              <div className="text-5xl font-black text-red-400">
                ⏱️ Temps écoulé !
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
        {wrong && (
          <p className="mb-2 text-center text-lg font-semibold text-red-400 animate-fadein">
            Raté, réessaie !
          </p>
        )}
        <input
          ref={inputRef}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onBlur={() => {
            if (phase === "playing")
              setTimeout(() => inputRef.current?.focus(), 10);
          }}
          disabled={phase !== "playing"}
          placeholder={
            phase === "playing" ? "Tape le titre de la chanson…" : "…"
          }
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`w-full rounded-2xl border-4 bg-zinc-900 px-8 py-6 text-center text-3xl font-bold text-white placeholder-zinc-600 outline-none transition disabled:opacity-40 ${
            wrong
              ? "border-red-500 animate-shake"
              : "border-violet-500 focus:border-spotify focus:shadow-lg focus:shadow-spotify/20"
          }`}
        />
      </form>
    </main>
  );
}
