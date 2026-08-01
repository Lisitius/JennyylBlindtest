"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { THEMES, THEMES_AVEC_FILM } from "@/lib/themes-list";

export default function SalonAccueil() {
  const router = useRouter();
  const [moi, setMoi] = useState(null);
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  // Réglages de création (animatrice uniquement)
  const [theme, setTheme] = useState("2000s");
  const [nbTracks, setNbTracks] = useState(10);
  const [roundSeconds, setRoundSeconds] = useState(30);
  const [mode, setMode] = useState("full");
  const [autoNext, setAutoNext] = useState(false);
  const [hostPlays, setHostPlays] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.connecte) router.replace("/connexion");
        else setMoi(d);
      })
      .catch(() => setErreur("Chargement impossible."));
  }, [router]);

  async function rejoindre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const c = code.trim().toUpperCase();
    const r = await fetch(`/api/rooms/${c}/join`, { method: "POST" });
    const d = await r.json();
    if (!r.ok) {
      setErreur(d.error);
      setEnvoi(false);
      return;
    }
    router.push(`/salon/${c}`);
  }

  async function creer() {
    setErreur(null);
    setEnvoi(true);
    const r = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: THEMES.find((t) => t.key === theme)?.label,
        theme,
        nbTracks,
        roundSeconds,
        mode,
        autoNext,
        hostPlays,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErreur(d.error);
      setEnvoi(false);
      return;
    }
    router.push(`/salon/${d.code}`);
  }

  if (!moi) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-jenny-line border-t-jenny" />
      </main>
    );
  }

  const avecFilm = THEMES_AVEC_FILM.includes(theme);
  const MODES = avecFilm
    ? [
        { key: "full", label: "Titre + artiste + film" },
        { key: "title-film", label: "Titre + film" },
        { key: "film", label: "Film" },
      ]
    : [
        { key: "full", label: "Titre + Artiste" },
        { key: "title", label: "Titre seul" },
      ];
  const modeActif = MODES.some((m) => m.key === mode) ? mode : "full";

  const btn = (actif) =>
    `rounded-full px-4 py-2 text-sm font-bold transition ${
      actif
        ? "bg-gradient-to-r from-jenny to-jenny-pink text-white"
        : "text-zinc-400 hover:text-white"
    }`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-black">
          🎉 <span className="text-gradient">Partie entre amis</span>
        </h1>
        <Link
          href="/playlists"
          className="rounded-full bg-zinc-800 px-5 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700"
        >
          ← Jeu solo
        </Link>
      </header>

      {erreur && (
        <p className="mb-6 rounded-xl bg-red-950/60 p-4 font-semibold text-red-300 ring-1 ring-red-800">
          {erreur}
        </p>
      )}

      {/* Rejoindre */}
      <section className="mb-8 rounded-2xl bg-jenny-surface/60 p-6 ring-1 ring-jenny-line">
        <h2 className="mb-4 text-2xl font-bold text-zinc-300">
          Rejoindre un salon
        </h2>
        <form onSubmit={rejoindre} className="flex flex-wrap gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            maxLength={6}
            className="flex-1 rounded-2xl border-2 border-jenny-line bg-zinc-900/60 px-6 py-4 text-center text-3xl font-black tracking-[0.3em] text-white placeholder-zinc-600 outline-none transition focus:border-jenny"
          />
          <button
            disabled={envoi || code.trim().length < 4}
            className="rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-8 py-4 text-xl font-black text-white transition hover:brightness-110 disabled:opacity-40"
          >
            Rejoindre
          </button>
        </form>
      </section>

      {/* Créer (animatrice) */}
      {moi.peutAnimer ? (
        <section className="rounded-2xl bg-jenny-surface/60 p-6 ring-1 ring-jenny-line">
          <h2 className="mb-4 text-2xl font-bold text-zinc-300">
            🎤 Créer un salon
          </h2>

          <p className="mb-2 text-sm font-bold text-zinc-400">Thème</p>
          <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={`rounded-xl p-3 text-center text-xs font-bold ring-1 transition ${
                  theme === t.key
                    ? "bg-jenny/20 text-white ring-jenny"
                    : "bg-zinc-900/60 text-zinc-400 ring-jenny-line hover:text-white"
                }`}
              >
                <div className="text-2xl">{t.emoji}</div>
                {t.label}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div>
              <p className="mb-1 text-sm font-bold text-zinc-400">Musiques</p>
              <div className="flex rounded-full bg-zinc-900 p-1 ring-1 ring-jenny-line">
                {[10, 15, 20].map((n) => (
                  <button key={n} onClick={() => setNbTracks(n)} className={btn(nbTracks === n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-zinc-400">Temps</p>
              <div className="flex rounded-full bg-zinc-900 p-1 ring-1 ring-jenny-line">
                {[15, 20, 30, 45].map((n) => (
                  <button key={n} onClick={() => setRoundSeconds(n)} className={btn(roundSeconds === n)}>
                    {n}s
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-zinc-400">Mode</p>
              <div className="flex flex-wrap rounded-full bg-zinc-900 p-1 ring-1 ring-jenny-line">
                {MODES.map((m) => (
                  <button key={m.key} onClick={() => setMode(m.key)} className={btn(modeActif === m.key)}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="mb-2 flex cursor-pointer items-center gap-3 rounded-xl bg-zinc-900/60 p-3 ring-1 ring-jenny-line">
            <input
              type="checkbox"
              checked={autoNext}
              onChange={(e) => setAutoNext(e.target.checked)}
              className="h-5 w-5 accent-[#a78bee]"
            />
            <span className="text-sm text-zinc-300">
              <strong className="text-white">Chanson suivante automatique</strong>{" "}
              — sinon c'est toi qui cliques pour lancer chaque chanson
              (modifiable en cours de partie).
            </span>
          </label>

          <label className="mb-5 flex cursor-pointer items-center gap-3 rounded-xl bg-zinc-900/60 p-3 ring-1 ring-jenny-line">
            <input
              type="checkbox"
              checked={hostPlays}
              onChange={(e) => setHostPlays(e.target.checked)}
              className="h-5 w-5 accent-[#a78bee]"
            />
            <span className="text-sm text-zinc-300">
              <strong className="text-white">Je participe aussi</strong> — les
              réponses restent masquées sur ton écran pour que tu joues à la
              loyale.
            </span>
          </label>

          <button
            onClick={creer}
            disabled={envoi}
            className="w-full rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-8 py-4 text-xl font-black text-white shadow-lg shadow-jenny/40 transition hover:brightness-110 disabled:opacity-40"
          >
            {envoi ? "Préparation…" : "Ouvrir le salon 🎉"}
          </button>
        </section>
      ) : (
        <p className="rounded-2xl bg-jenny-surface/60 p-6 text-center text-zinc-400 ring-1 ring-jenny-line">
          Seuls les animateurs peuvent créer un salon. Demande ton code à
          l'organisateur de la partie !
        </p>
      )}
    </main>
  );
}
