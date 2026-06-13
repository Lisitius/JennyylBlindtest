"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isCorrectAnswer } from "@/lib/normalize";

const ROUND_SECONDS = 20;
const TRANSITION_SECONDS = 5;
const FIRST_TRANSITION_SECONDS = 3;
const REVEAL_CORRECT_MS = 2000;
const REVEAL_TIMEOUT_MS = 4000;
const NB_TRACKS = 10;

export default function GameClient() {
  const router = useRouter();
  const params = useSearchParams();
  const playlistId = params.get("playlist");
  const themeKey = params.get("theme");
  const playlistName = params.get("name") || "Playlist";
  const replayQuery = params.toString();

  // phase : loading -> ready -> transition -> playing -> reveal -> (boucle) -> /results
  const [phase, setPhase] = useState("loading");
  const [tracks, setTracks] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [countdown, setCountdown] = useState(TRANSITION_SECONDS);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(false);
  const [lastResult, setLastResult] = useState(null); // "correct" | "timeout"
  const [error, setError] = useState(null);

  const playerRef = useRef(null);
  const deviceIdRef = useRef(null);
  const resultsRef = useRef([]);
  const inputRef = useRef(null);
  const roundEndedRef = useRef(false);

  function fail(message) {
    setError(message);
    setPhase("error");
  }

  // ---- Chargement des morceaux (playlist perso ou thème) ----
  useEffect(() => {
    if (!playlistId && !themeKey) {
      fail("Aucune playlist sélectionnée.");
      return;
    }
    const url = themeKey
      ? `/api/spotify/theme-tracks?key=${themeKey}&count=${NB_TRACKS}`
      : `/api/spotify/playlist-tracks?id=${playlistId}&count=${NB_TRACKS}`;
    fetch(url)
      .then(async (r) => {
        const d = await r.json();
        if (r.status === 401) {
          router.replace("/");
          throw new Error("redirect");
        }
        if (!r.ok) throw new Error(d.error || "Impossible de charger la playlist.");
        return d;
      })
      .then((d) => {
        if (!d.tracks?.length)
          throw new Error("Cette playlist ne contient pas de titres jouables.");
        setTracks(d.tracks);
      })
      .catch((e) => {
        if (e.message !== "redirect") fail(e.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId, themeKey]);

  // ---- Initialisation du Spotify Web Playback SDK ----
  useEffect(() => {
    let cancelled = false;

    function init() {
      if (cancelled || playerRef.current) return;
      const player = new window.Spotify.Player({
        name: "Blindtest 🎧",
        getOAuthToken: (cb) => {
          fetch("/api/spotify/token")
            .then((r) => r.json())
            .then((d) => d.accessToken && cb(d.accessToken))
            .catch(() => {});
        },
        volume: 0.75,
      });
      player.addListener("ready", ({ device_id }) => {
        deviceIdRef.current = device_id;
        setSdkReady(true);
      });
      player.addListener("not_ready", () => setSdkReady(false));
      player.addListener("initialization_error", ({ message }) =>
        fail("Le lecteur Spotify n'a pas pu démarrer : " + message)
      );
      player.addListener("authentication_error", () =>
        fail("Session Spotify expirée. Retourne à l'accueil pour te reconnecter.")
      );
      player.addListener("account_error", () =>
        fail(
          "Spotify Premium est requis pour jouer la musique dans le navigateur."
        )
      );
      player.connect();
      playerRef.current = player;
    }

    if (window.Spotify) {
      init();
    } else {
      window.onSpotifyWebPlaybackSDKReady = init;
      if (!document.getElementById("spotify-sdk")) {
        const s = document.createElement("script");
        s.id = "spotify-sdk";
        s.src = "https://sdk.scdn.co/spotify-player.js";
        s.async = true;
        document.body.appendChild(s);
      }
    }

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.disconnect();
        } catch {}
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Tout est prêt -> écran "GO" ----
  useEffect(() => {
    if (phase === "loading" && tracks && sdkReady) setPhase("ready");
  }, [phase, tracks, sdkReady]);

  // ---- Démarrage de la partie (clic utilisateur = autorise l'audio) ----
  async function handleStart() {
    try {
      // Nécessaire pour que le navigateur autorise la lecture audio.
      playerRef.current?.activateElement?.();
    } catch {}
    fetch("/api/spotify/transfer", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: deviceIdRef.current }),
    }).catch(() => {});
    resultsRef.current = [];
    setScore(0);
    setRoundIndex(0);
    setPhase("transition");
  }

  // ---- Compte à rebours de transition puis lancement du morceau ----
  useEffect(() => {
    if (phase !== "transition" || !tracks) return;
    let c = roundIndex === 0 ? FIRST_TRANSITION_SECONDS : TRANSITION_SECONDS;
    setCountdown(c);
    let stopped = false;

    async function launchTrack() {
      const track = tracks[roundIndex];
      const body = JSON.stringify({
        deviceId: deviceIdRef.current,
        uri: track.uri,
      });
      let r = await fetch("/api/spotify/play", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (r.status === 404) {
        // Le device peut mettre un instant à être visible : on refait un
        // transfert vers notre lecteur puis on retente une fois.
        await fetch("/api/spotify/transfer", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: deviceIdRef.current }),
        }).catch(() => {});
        await new Promise((res) => setTimeout(res, 1500));
        r = await fetch("/api/spotify/play", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
        });
      }
      if (stopped) return;
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        fail(d.error || "Impossible de lancer la lecture.");
        return;
      }
      roundEndedRef.current = false;
      setAnswer("");
      setLastResult(null);
      setTimeLeft(ROUND_SECONDS);
      setPhase("playing");
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

  // ---- Fin de manche (bonne réponse ou temps écoulé) ----
  function endRound(found) {
    if (roundEndedRef.current) return;
    roundEndedRef.current = true;
    fetch("/api/spotify/pause", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: deviceIdRef.current }),
    }).catch(() => {});
    const track = tracks[roundIndex];
    resultsRef.current.push({
      name: track.name,
      artists: track.artists,
      image: track.image,
      found,
    });
    if (found) setScore((s) => s + 1);
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
        endRound(false);
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
            score: items.filter((i) => i.found).length,
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
    if (isCorrectAnswer(answer, track.name)) {
      endRound(true);
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
    timeLeft > 10 ? "bg-spotify" : timeLeft > 5 ? "bg-yellow-400" : "bg-red-500";

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
            ← Choisir une playlist
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
        <p className="text-2xl text-zinc-400">
          {!tracks ? "Chargement de la playlist…" : "Démarrage du lecteur Spotify…"}
        </p>
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
          La musique sera jouée directement dans cet onglet. Monte le son ! 🔊
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-8">
      {/* Barre du haut : progression + score */}
      <div className="flex w-full max-w-3xl items-center justify-between text-xl font-bold text-zinc-300">
        <span>
          Musique{" "}
          <span className="text-white">
            {roundIndex + 1} / {tracks.length}
          </span>
        </span>
        <span className="truncate px-4 text-base font-semibold text-zinc-500">
          {playlistName}
        </span>
        <span>
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
              <div className="mt-2 text-center text-3xl font-black tabular-nums">
                {Math.ceil(timeLeft)}s
              </div>
            </div>
          </>
        )}

        {phase === "reveal" && track && (
          <div className="flex flex-col items-center gap-6 text-center animate-pop">
            {lastResult === "correct" ? (
              <div className="text-5xl font-black text-spotify">
                ✅ Bonne réponse !
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
