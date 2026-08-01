"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// Vue destinée à être capturée par OBS : gros affichage, aucune réponse
// visible tant que la révélation n'a pas eu lieu.
export default function VueStream() {
  const { code } = useParams();
  const [etat, setEtat] = useState(null);
  const [decalage, setDecalage] = useState(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    let stop = false;
    async function charger() {
      try {
        const r = await fetch(`/api/rooms/${code}/state`);
        const d = await r.json();
        if (!r.ok || stop) return;
        setDecalage(new Date(d.serveurMaintenant).getTime() - Date.now());
        setEtat(d);
      } catch {
        /* on retentera */
      }
    }
    charger();
    const id = setInterval(charger, 1000);
    const tick = setInterval(() => setTick((t) => t + 1), 200);
    return () => {
      stop = true;
      clearInterval(id);
      clearInterval(tick);
    };
  }, [code]);

  if (!etat) {
    return <main className="flex min-h-screen items-center justify-center" />;
  }

  const duree = etat.debutManche
    ? (new Date(etat.finManche) - new Date(etat.debutManche)) / 1000
    : 30;
  const avantDebut = etat.debutManche
    ? (new Date(etat.debutManche).getTime() - decalage - Date.now()) / 1000
    : 0;
  const enDecompte = etat.statut === "playing" && avantDebut > 0;
  const restant = etat.finManche
    ? Math.min(
        duree,
        Math.max(0, (new Date(etat.finManche).getTime() - decalage - Date.now()) / 1000)
      )
    : 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-10 py-8">
      {etat.statut === "lobby" && (
        <>
          <p className="text-3xl font-bold text-zinc-300">
            Rejoins la partie avec le code
          </p>
          <p className="text-[10rem] font-black leading-none tracking-[0.15em] text-gradient">
            {etat.code}
          </p>
          <p className="text-2xl text-zinc-400">
            {etat.joueurs.length} joueur{etat.joueurs.length > 1 ? "s" : ""} connecté
            {etat.joueurs.length > 1 ? "s" : ""}
          </p>
        </>
      )}

      {enDecompte && (
        <>
          <p className="text-4xl font-bold text-zinc-300">
            {etat.manche === 0 ? "Ça commence dans…" : "Prochaine musique dans…"}
          </p>
          <p
            key={Math.ceil(avantDebut)}
            className="text-[12rem] font-black leading-none text-gradient animate-pop"
          >
            {Math.ceil(avantDebut)}
          </p>
        </>
      )}

      {(etat.statut === "playing" || etat.statut === "paused") && !enDecompte && (
        <>
          <p className="text-3xl font-bold text-zinc-400">
            Musique {etat.manche + 1} / {etat.total}
          </p>
          <div className="text-[9rem] leading-none">
            {etat.statut === "paused" ? "⏸️" : "🎶"}
          </div>
          <p className="text-8xl font-black tabular-nums text-gradient">
            {Math.ceil(restant)}s
          </p>
        </>
      )}

      {etat.statut === "reveal" && etat.morceau && (
        <div className="flex flex-col items-center gap-4 animate-pop">
          {etat.morceau.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={etat.morceau.image} alt="" className="h-64 w-64 rounded-3xl shadow-2xl" />
          )}
          <p className="text-6xl font-black">{etat.morceau.name}</p>
          <p className="text-4xl text-zinc-300">{etat.morceau.artists}</p>
          {etat.morceau.film && (
            <p className="text-3xl font-bold text-jenny-light">🎬 {etat.morceau.film}</p>
          )}
        </div>
      )}

      {etat.statut === "ended" && (
        <p className="text-7xl font-black text-gradient">🏁 Partie terminée</p>
      )}

      {/* Classement */}
      {etat.joueurs.length > 0 && (
        <div className="mt-4 flex w-full max-w-3xl flex-col gap-2">
          {etat.joueurs.slice(0, 8).map((j, i) => (
            <div
              key={j.pseudo}
              className={`flex items-center justify-between rounded-2xl px-8 py-4 text-3xl ring-2 ${
                i === 0
                  ? "bg-jenny/25 ring-jenny"
                  : "bg-jenny-surface/70 ring-jenny-line"
              }`}
            >
              <span className="truncate font-bold">
                {["🥇", "🥈", "🥉"][i] || `${i + 1}.`}{" "}
                {j.role === "admin" && "🛡️ "}
                {j.role === "animateur" && "🎤 "}
                {j.pseudo}
              </span>
              <span className="font-black text-jenny-light">{j.score}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
