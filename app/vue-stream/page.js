"use client";

import { useEffect, useState } from "react";

// Vue destinée au direct (OBS) pour les parties SOLO.
// Elle lit l'état publié par l'onglet de jeu : aucune réponse n'y apparaît
// avant la révélation.
export default function VueStreamSolo() {
  const [etat, setEtat] = useState(null);
  const [, battement] = useState(0);

  useEffect(() => {
    const lire = () => {
      try {
        const brut = window.localStorage.getItem("blindtest-solo-stream");
        if (brut) setEtat(JSON.parse(brut));
      } catch {
        // rien à afficher
      }
    };
    lire();
    // L'événement "storage" prévient dès que l'onglet de jeu écrit quelque
    // chose ; la relecture régulière sert de filet de sécurité.
    window.addEventListener("storage", lire);
    const id = setInterval(lire, 300);
    const tic = setInterval(() => battement((b) => b + 1), 200);
    return () => {
      window.removeEventListener("storage", lire);
      clearInterval(id);
      clearInterval(tic);
    };
  }, []);

  if (!etat) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-10 text-center">
        <div className="text-8xl">🐨</div>
        <p className="text-3xl font-bold text-zinc-300">Vue stream</p>
        <p className="max-w-xl text-xl text-zinc-500">
          Lance une partie dans l'autre onglet : l'affichage apparaîtra ici
          automatiquement.
        </p>
      </main>
    );
  }

  // On recalcule le temps restant à partir de l'heure de fin : l'affichage
  // continue de défiler même si l'onglet de jeu est ralenti en arrière-plan.
  const secondes =
    etat.phase === "playing" && etat.finAbs
      ? Math.max(0, Math.ceil((etat.finAbs - Date.now()) / 1000))
      : etat.secondes;
  // Sans nouvelle depuis 40 s, la partie est probablement terminée ou fermée.
  const obsolete = Date.now() - (etat.maj || 0) > 40000;
  const pct = etat.duree ? (secondes / etat.duree) * 100 : 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-10 py-8 text-center">
      <p className="text-3xl font-bold text-zinc-400">{etat.nom}</p>

      {obsolete ? (
        <p className="text-5xl font-black text-zinc-600">En attente…</p>
      ) : etat.phase === "ready" ? (
        <>
          <div className="text-[9rem] leading-none">🎵</div>
          <p className="text-5xl font-black text-gradient">Prêt à jouer</p>
        </>
      ) : etat.phase === "transition" ? (
        <>
          <p className="text-4xl font-bold text-zinc-300">
            Prochaine musique dans…
          </p>
          <p
            key={etat.compteARebours}
            className="text-[12rem] font-black leading-none text-gradient animate-pop"
          >
            {etat.compteARebours}
          </p>
        </>
      ) : etat.phase === "playing" ? (
        <>
          <p className="text-3xl font-bold text-zinc-400">
            Musique {etat.manche} / {etat.total}
          </p>
          <div className="text-[8rem] leading-none">🎶</div>

          <div className="flex gap-6 text-3xl font-bold">
            {etat.champs.titre && (
              <span
                className={`rounded-2xl px-6 py-3 ring-2 ${etat.trouve.titre ? "bg-jenny/25 text-jenny-light ring-jenny" : "bg-jenny-surface/70 text-zinc-300 ring-jenny-line"}`}
              >
                🎵 {etat.trouve.titre ? "✓" : `${etat.points.titre} pts`}
              </span>
            )}
            {etat.champs.artiste && (
              <span
                className={`rounded-2xl px-6 py-3 ring-2 ${etat.trouve.artiste ? "bg-jenny/25 text-jenny-light ring-jenny" : "bg-jenny-surface/70 text-zinc-300 ring-jenny-line"}`}
              >
                🎤 {etat.trouve.artiste ? "✓" : `${etat.points.artiste} pts`}
              </span>
            )}
            {etat.champs.film && (
              <span
                className={`rounded-2xl px-6 py-3 ring-2 ${etat.trouve.film ? "bg-jenny/25 text-jenny-light ring-jenny" : "bg-jenny-surface/70 text-zinc-300 ring-jenny-line"}`}
              >
                🎬 {etat.trouve.film ? "✓" : `${etat.points.film} pts`}
              </span>
            )}
          </div>

          <div className="w-full max-w-3xl">
            <div className="h-6 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-200 ${secondes > etat.duree * 0.5 ? "bg-jenny" : secondes > etat.duree * 0.25 ? "bg-yellow-400" : "bg-red-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <p className="text-8xl font-black tabular-nums text-gradient">
            {secondes}s
          </p>
        </>
      ) : etat.phase === "reveal" && etat.morceau ? (
        <div className="flex flex-col items-center gap-4 animate-pop">
          <p className="text-4xl font-black text-jenny">
            {etat.resultat === "none"
              ? "⏱️ Temps écoulé"
              : etat.resultat === "both"
                ? `✅ Trouvé ! +${etat.gagnes}`
                : `👍 Presque ! +${etat.gagnes}`}
          </p>
          {etat.morceau.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={etat.morceau.image}
              alt=""
              className="h-56 w-56 rounded-3xl shadow-2xl"
            />
          )}
          <p className="text-6xl font-black">{etat.morceau.nom}</p>
          <p className="text-4xl text-zinc-300">{etat.morceau.artistes}</p>
          {etat.morceau.film && (
            <p className="text-3xl font-bold text-jenny-light">
              🎬 {etat.morceau.film}
            </p>
          )}
        </div>
      ) : null}

      {/* Score toujours visible */}
      <div className="rounded-3xl bg-jenny-surface/70 px-12 py-5 ring-2 ring-jenny-line">
        <span className="text-3xl font-bold text-zinc-400">Score </span>
        <span className="text-5xl font-black text-jenny-light">{etat.score}</span>
      </div>

      {/* Derniers morceaux passés */}
      {etat.historique?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {[...etat.historique].reverse().map((h, i) => (
            <span
              key={i}
              className="rounded-xl bg-jenny-surface/60 px-4 py-2 text-lg ring-1 ring-jenny-line"
            >
              {h.nom}
              <span
                className={`ml-2 font-black ${h.points > 0 ? "text-jenny-light" : "text-zinc-500"}`}
              >
                {h.points > 0 ? `+${h.points}` : "0"}
              </span>
            </span>
          ))}
        </div>
      )}
    </main>
  );
}
