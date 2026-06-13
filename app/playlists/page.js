"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const THEMES = [
  { key: "70s", label: "Années 70", emoji: "🕺", desc: "Disco, funk & soul" },
  { key: "80s", label: "Années 80", emoji: "📻", desc: "Indochine, Madonna…" },
  { key: "90s", label: "Années 90", emoji: "📼", desc: "Destiny's Child, Will Smith…" },
  { key: "2000s", label: "Années 2000", emoji: "💿", desc: "Coldplay, Eminem…" },
  { key: "2010s", label: "Années 2010", emoji: "📱", desc: "Pitbull, Sexion d'Assaut…" },
  { key: "pop", label: "Pop", emoji: "🎤", desc: "Les tubes pop du moment" },
  { key: "rock", label: "Rock", emoji: "🎸", desc: "AC/DC, Oasis, Bowie…" },
  { key: "metal", label: "Metal", emoji: "🤘", desc: "Måneskin, AC/DC…" },
  { key: "rapfr", label: "Rap FR", emoji: "🎙️", desc: "Niska, ElGrandeToto…" },
  { key: "varietefr", label: "Variété FR", emoji: "🇫🇷", desc: "Goldman, Balavoine…" },
  { key: "karaoke", label: "Karaoké FR", emoji: "🎵", desc: "Kyo, Jenifer… à chanter !" },
  { key: "disney", label: "Disney", emoji: "🏰", desc: "Les classiques Disney" },
  { key: "films", label: "Films & Séries", emoji: "🎬", desc: "Star Wars, Gladiator…" },
  { key: "electro", label: "Électro", emoji: "🎛️", desc: "EDM & dance" },
  { key: "latino", label: "Latino", emoji: "💃", desc: "Reggaeton & hits latinos" },
  { key: "reggae", label: "Reggae", emoji: "🌴", desc: "Bob Marley & roots" },
  { key: "kpop", label: "K-Pop", emoji: "🇰🇷", desc: "NewJeans, i-dle…" },
  { key: "jazz", label: "Jazz", emoji: "🎷", desc: "Armstrong, Nina Simone…" },
];

function SelectMark() {
  return (
    <div className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-jenny text-xl font-black text-white animate-pop">
      ✓
    </div>
  );
}

export default function PlaylistsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      const r = await fetch(`/api/deezer/search?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "search_failed");
      setResults(d);
    } catch {
      setError("La recherche a échoué. Vérifie ta connexion et réessaie.");
    } finally {
      setSearching(false);
    }
  }

  function launch() {
    if (!selected) return;
    const qs = selected.theme
      ? `theme=${selected.theme}`
      : selected.artist
        ? `artist=${selected.artist}`
        : `playlist=${selected.playlist}`;
    router.push(`/game?${qs}&name=${encodeURIComponent(selected.name)}`);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 pb-40 pt-10">
      <header className="mb-10 flex items-center justify-between">
        <h1 className="text-4xl font-black">
          🐨 <span className="text-gradient">Choisis ton blindtest</span>
        </h1>
        <button
          onClick={() => router.push("/")}
          className="rounded-full bg-zinc-800 px-5 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700"
        >
          ← Accueil
        </button>
      </header>

      <section className="mb-12 animate-fadein">
        <h2 className="mb-5 text-2xl font-bold text-zinc-300">Thèmes</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {THEMES.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelected({ theme: t.key, name: t.label })}
              className={`group relative flex flex-col items-center gap-1 overflow-hidden rounded-xl bg-gradient-to-br from-jenny-surface to-jenny-deep p-3 text-center transition hover:from-jenny-dark/40 hover:to-jenny-surface hover:scale-[1.03] ${
                selected?.theme === t.key
                  ? "ring-2 ring-jenny shadow-lg shadow-jenny/30"
                  : "ring-1 ring-jenny-line"
              }`}
            >
              {selected?.theme === t.key && <SelectMark />}
              <div className="text-4xl">{t.emoji}</div>
              <div className="text-sm font-black leading-tight">{t.label}</div>
              <div className="text-xs leading-tight text-zinc-400">{t.desc}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="animate-fadein">
        <h2 className="mb-5 text-2xl font-bold text-zinc-300">
          Ou cherche un artiste / une playlist
        </h2>
        <form onSubmit={handleSearch} className="mb-8 flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Lorie, Pop, Rock, soirée karaoké etc..."
            className="w-full rounded-2xl border-2 border-jenny-line bg-jenny-surface/60 px-6 py-4 text-xl font-semibold text-white placeholder-zinc-500 outline-none transition focus:border-jenny"
          />
          <button
            type="submit"
            disabled={searching}
            className="shrink-0 rounded-2xl bg-zinc-100 px-8 py-4 text-xl font-black text-black transition hover:bg-white disabled:opacity-50"
          >
            {searching ? "…" : "Chercher"}
          </button>
        </form>

        {error && (
          <div className="mb-8 rounded-2xl bg-red-950/60 p-5 text-lg text-red-300 ring-1 ring-red-800">
            {error}
          </div>
        )}

        {results && (
          <>
            {results.artists?.length > 0 && (
              <>
                <h3 className="mb-4 text-lg font-bold text-zinc-400">
                  Artistes
                </h3>
                <div className="mb-10 grid grid-cols-3 gap-5 sm:grid-cols-4 lg:grid-cols-6">
                  {results.artists.map((a) => (
                    <button
                      key={a.id}
                      onClick={() =>
                        setSelected({ artist: a.id, name: a.name })
                      }
                      className={`group relative flex flex-col items-center gap-3 rounded-2xl bg-zinc-900 p-4 transition hover:bg-zinc-800 hover:scale-[1.02] ${
                        selected?.artist === a.id
                          ? "ring-4 ring-jenny"
                          : "ring-1 ring-zinc-800"
                      }`}
                    >
                      {selected?.artist === a.id && <SelectMark />}
                      {a.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.image}
                          alt=""
                          className="h-24 w-24 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 text-4xl">
                          🎤
                        </div>
                      )}
                      <div className="w-full truncate text-center font-bold">
                        {a.name}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {results.playlists?.length > 0 && (
              <>
                <h3 className="mb-4 text-lg font-bold text-zinc-400">
                  Playlists
                </h3>
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
                  {results.playlists.map((p) => (
                    <button
                      key={p.id}
                      onClick={() =>
                        setSelected({ playlist: p.id, name: p.name })
                      }
                      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900 text-left transition hover:bg-zinc-800 hover:scale-[1.02] ${
                        selected?.playlist === p.id
                          ? "ring-4 ring-jenny"
                          : "ring-1 ring-zinc-800"
                      }`}
                    >
                      <div className="relative aspect-square w-full bg-zinc-800">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-5xl">
                            🎵
                          </div>
                        )}
                        {selected?.playlist === p.id && <SelectMark />}
                      </div>
                      <div className="p-3">
                        <div className="truncate font-bold">{p.name}</div>
                        <div className="truncate text-sm text-zinc-400">
                          {p.tracksTotal != null
                            ? `${p.tracksTotal} titres`
                            : p.author}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {!results.artists?.length && !results.playlists?.length && (
              <p className="text-lg text-zinc-500">
                Aucun résultat. Essaie une autre recherche.
              </p>
            )}
          </>
        )}
      </section>

      {selected && (
        <div className="fixed inset-x-0 bottom-0 border-t border-jenny-line bg-jenny-deep/95 p-5 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
            <div className="min-w-0">
              <div className="text-sm text-zinc-400">Sélection</div>
              <div className="truncate text-xl font-bold">{selected.name}</div>
            </div>
            <button
              onClick={launch}
              className="shrink-0 rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-8 py-4 text-xl font-black text-white shadow-lg shadow-jenny/40 transition hover:scale-105 hover:brightness-110"
            >
              Lancer le blindtest →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
