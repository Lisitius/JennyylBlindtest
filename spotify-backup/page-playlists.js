"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

// Thèmes générés via la recherche de titres Spotify (year:/genre:),
// car Spotify bloque la lecture des playlists publiques pour les
// nouvelles applications.
const THEMES = [
  { key: "2000s", label: "Années 2000", emoji: "💿", desc: "Les hits de 2000 à 2009" },
  { key: "90s", label: "Années 90", emoji: "📼", desc: "Les hits de 1990 à 1999" },
  { key: "pop", label: "Pop", emoji: "🎤", desc: "Les tubes pop du moment" },
  { key: "rock", label: "Rock", emoji: "🎸", desc: "Les classiques du rock" },
  { key: "rapfr", label: "Rap FR", emoji: "🎙️", desc: "Le meilleur du rap français" },
];

function ThemeCard({ theme, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 text-center transition hover:from-zinc-700 hover:to-zinc-800 hover:scale-[1.02] ${
        selected
          ? "ring-4 ring-spotify shadow-lg shadow-spotify/20"
          : "ring-1 ring-zinc-800"
      }`}
    >
      {selected && (
        <div className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-spotify text-xl font-black text-black animate-pop">
          ✓
        </div>
      )}
      <div className="text-6xl">{theme.emoji}</div>
      <div className="text-xl font-black">{theme.label}</div>
      <div className="text-sm text-zinc-400">{theme.desc}</div>
    </button>
  );
}

function PlaylistCard({ playlist, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`group flex flex-col overflow-hidden rounded-2xl bg-zinc-900 text-left transition hover:bg-zinc-800 hover:scale-[1.02] ${
        selected
          ? "ring-4 ring-spotify shadow-lg shadow-spotify/20"
          : "ring-1 ring-zinc-800"
      }`}
    >
      <div className="relative aspect-square w-full bg-zinc-800">
        {playlist.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.image}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">
            🎵
          </div>
        )}
        {selected && (
          <div className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-spotify text-xl font-black text-black animate-pop">
            ✓
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="truncate text-lg font-bold">{playlist.name}</div>
        <div className="truncate text-sm text-zinc-400">
          {playlist.tracksTotal != null
            ? `${playlist.tracksTotal} titres`
            : playlist.owner || "Playlist"}
        </div>
      </div>
    </button>
  );
}

export default function PlaylistsPage() {
  const router = useRouter();
  const [myPlaylists, setMyPlaylists] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/spotify/playlists");
        if (r.status === 401) {
          router.replace("/");
          return;
        }
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "load_failed");
        if (!cancelled) setMyPlaylists(d.playlists || []);
      } catch {
        if (!cancelled) {
          setError("Impossible de charger tes playlists. Recharge la page.");
          setMyPlaylists([]);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function launch() {
    if (!selected) return;
    const qs = selected.theme
      ? `theme=${selected.theme}&name=${encodeURIComponent(selected.name)}`
      : `playlist=${selected.id}&name=${encodeURIComponent(selected.name)}`;
    router.push(`/game?${qs}`);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 pb-40 pt-10">
      <header className="mb-10 flex items-center justify-between">
        <h1 className="text-4xl font-black">🎧 Choisis ta playlist</h1>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-full bg-zinc-800 px-5 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700"
        >
          Déconnexion
        </button>
      </header>

      <section className="mb-12 animate-fadein">
        <h2 className="mb-5 text-2xl font-bold text-zinc-300">
          Thèmes
        </h2>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {THEMES.map((t) => (
            <ThemeCard
              key={t.key}
              theme={t}
              selected={selected?.theme === t.key}
              onSelect={() => setSelected({ theme: t.key, name: t.label })}
            />
          ))}
        </div>
      </section>

      <section className="animate-fadein">
        <h2 className="mb-5 text-2xl font-bold text-zinc-300">
          Tes playlists
        </h2>
        {error && (
          <div className="mb-6 rounded-2xl bg-red-950/60 p-5 text-lg text-red-300 ring-1 ring-red-800">
            {error}
          </div>
        )}
        {myPlaylists === null && !error && (
          <div className="flex items-center gap-4 py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-spotify" />
            <p className="text-lg text-zinc-400">Chargement…</p>
          </div>
        )}
        {myPlaylists !== null &&
          (myPlaylists.filter((p) => p.tracksTotal !== 0).length === 0 ? (
            !error && (
              <p className="text-lg text-zinc-500">
                Aucune playlist trouvée sur ton compte.
              </p>
            )
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {myPlaylists
                .filter((p) => p.tracksTotal !== 0)
                .map((p) => (
                  <PlaylistCard
                    key={p.id}
                    playlist={p}
                    selected={selected?.id === p.id}
                    onSelect={() => setSelected({ id: p.id, name: p.name })}
                  />
                ))}
            </div>
          ))}
      </section>

      {selected && (
        <div className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/95 p-5 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
            <div className="min-w-0">
              <div className="text-sm text-zinc-400">Sélection</div>
              <div className="truncate text-xl font-bold">{selected.name}</div>
            </div>
            <button
              onClick={launch}
              className="shrink-0 rounded-full bg-spotify px-8 py-4 text-xl font-black text-black transition hover:scale-105 hover:brightness-110"
            >
              Lancer le blindtest →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
