"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function scoreMessage(ratio) {
  if (ratio >= 0.95) return "Parfait, incroyable ! 🏆";
  if (ratio >= 0.7) return "Excellente oreille ! 🔥";
  if (ratio >= 0.4) return "Pas mal du tout ! 👏";
  if (ratio > 0) return "Ça se travaille… 💪";
  return "Aïe… on remet ça ? 😅";
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("blindtest-results");
      if (!raw) {
        router.replace("/playlists");
        return;
      }
      setResults(JSON.parse(raw));
    } catch {
      router.replace("/playlists");
    }
  }, [router]);

  if (!results) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-jenny-line border-t-jenny" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="text-center animate-pop">
        <div className="text-7xl">🏁</div>
        <h1 className="mt-4 text-3xl font-bold text-zinc-300">
          {results.playlistName}
        </h1>
        <div className="mt-6 text-8xl font-black text-gradient">
          {results.score}
          <span className="text-5xl text-zinc-500">
            {" "}
            / {results.maxPoints ?? results.total * 10} pts
          </span>
        </div>
        <p className="mt-2 text-xl font-semibold text-zinc-400">
          🎵 {results.titlesFound ?? 0} / {results.total} titres
          {!results.titleOnly && (
            <>
              {"  ·  "}🎤 {results.artistsFound ?? 0} / {results.total} artistes
            </>
          )}
        </p>
        <p className="mt-4 text-2xl font-semibold">
          {scoreMessage(
            results.score / (results.maxPoints ?? results.total * 10)
          )}
        </p>
      </div>

      <div className="mt-12 flex flex-col gap-3">
        {results.items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 rounded-2xl p-4 animate-fadein ${
              item.points > 0
                ? "bg-jenny/10 ring-1 ring-jenny/40"
                : "bg-zinc-900/70 ring-1 ring-zinc-800"
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt=""
                className="h-16 w-16 shrink-0 rounded-xl"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-2xl">
                🎵
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-xl font-bold">{item.name}</div>
              <div className="truncate text-zinc-400">{item.artists}</div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <div
                className={`rounded-full px-4 py-2 text-sm font-black ${
                  item.points > 0
                    ? "bg-jenny text-white"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {item.points > 0 ? `+${item.points} pts` : "✗ 0 pt"}
              </div>
              <div className="flex gap-1 text-base">
                <span
                  title="Titre"
                  className={item.foundTitle ? "" : "opacity-25 grayscale"}
                >
                  🎵
                </span>
                {!results.titleOnly && (
                  <span
                    title="Artiste"
                    className={item.foundArtist ? "" : "opacity-25 grayscale"}
                  >
                    🎤
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <button
          onClick={() => router.push(`/game?${results.replayQuery}`)}
          className="w-full rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-10 py-5 text-2xl font-black text-white shadow-lg shadow-jenny/40 transition hover:scale-105 hover:brightness-110 sm:w-auto"
        >
          🔁 Rejouer
        </button>
        <button
          onClick={() => router.push("/playlists")}
          className="w-full rounded-full bg-zinc-800 px-10 py-5 text-2xl font-bold transition hover:bg-zinc-700 sm:w-auto"
        >
          📂 Autre playlist
        </button>
      </div>
    </main>
  );
}
