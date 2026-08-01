"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import VolumeSlider, { getStoredVolume } from "@/components/VolumeSlider";

const INTERVALLE = 1200; // fréquence d'interrogation du serveur

export default function SalonPage() {
  const { code } = useParams();
  const router = useRouter();

  const [etat, setEtat] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [pret, setPret] = useState(false); // le clic qui autorise le son
  const [reponse, setReponse] = useState("");
  const [flash, setFlash] = useState(null);
  const [revele, setRevele] = useState(false); // l'animatrice demande à voir
  const [confirmQuitter, setConfirmQuitter] = useState(false);

  const audioRef = useRef(null);
  const minuteurRef = useRef(null);
  const decalageRef = useRef(0); // écart entre l'horloge du serveur et la nôtre
  const mancheJoueeRef = useRef(-1);
  const inputRef = useRef(null);
  const releveRef = useRef(revele);
  releveRef.current = revele;

  // --- Interrogation régulière de l'état ---
  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const r = await fetch(
          `/api/rooms/${code}/state${releveRef.current ? "?revele=1" : ""}`
        );
        if (r.status === 401) return router.replace("/connexion");
        const d = await r.json();
        if (!r.ok) {
          setErreur(d.error || "Salon indisponible.");
          return;
        }
        if (stop) return;
        decalageRef.current = new Date(d.serveurMaintenant).getTime() - Date.now();
        setEtat(d);
        setErreur(null);
      } catch {
        /* réseau : on retentera au prochain tour */
      }
    }
    tick();
    const id = setInterval(tick, INTERVALLE);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [code, router]);

  // --- Lecture de l'extrait, calée sur l'heure du serveur ---
  // Le minuteur est gardé dans une référence : sinon React l'annulerait à
  // chaque réponse du serveur (toutes les 1,2 s) et la musique ne partirait
  // jamais.
  useEffect(() => {
    if (!pret || !etat || etat.statut !== "playing" || !etat.morceau) return;
    if (mancheJoueeRef.current === etat.manche) return;
    mancheJoueeRef.current = etat.manche;

    const audio = audioRef.current;
    if (!audio) return;
    audio.src = etat.morceau.audio;
    audio.volume = getStoredVolume();

    const debutLocal = new Date(etat.debutManche).getTime() - decalageRef.current;
    const attente = debutLocal - Date.now();

    const demarrer = () => {
      // Arrivé en retard ? on démarre l'extrait au bon endroit.
      const enRetard = (Date.now() - debutLocal) / 1000;
      if (enRetard > 0.5) audio.currentTime = Math.min(enRetard, 28);
      audio.play().catch((e) => console.warn("[audio] lecture refusée", e?.name));
    };

    clearTimeout(minuteurRef.current);
    if (attente > 0) {
      minuteurRef.current = setTimeout(demarrer, attente);
    } else {
      demarrer();
    }
  }, [pret, etat]);

  // En quittant la page : on arrête le minuteur ET la musique. Sans cela,
  // l'extrait continuerait à jouer en arrière-plan après avoir quitté.
  useEffect(
    () => () => {
      clearTimeout(minuteurRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    },
    []
  );

  // --- Coupe le son hors manche ---
  useEffect(() => {
    if (!etat) return;
    if (etat.statut !== "playing" && audioRef.current) audioRef.current.pause();
  }, [etat?.statut]);

  useEffect(() => {
    if (etat?.statut === "playing") inputRef.current?.focus();
  }, [etat?.statut, etat?.manche]);

  // Rafraîchit l'affichage du chrono et du décompte entre deux réponses du
  // serveur, pour que les secondes défilent sans à-coups.
  const [, battement] = useState(0);
  useEffect(() => {
    const id = setInterval(() => battement((b) => b + 1), 200);
    return () => clearInterval(id);
  }, []);

  // Le clic de l'utilisateur est le seul moment où le navigateur autorise la
  // lecture audio. On joue un son silencieux pour "débloquer" le lecteur, qui
  // servira ensuite pour toutes les manches.
  function entrer() {
    const a = new Audio();
    a.volume = getStoredVolume();
    a.src =
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=";
    a.play()
      .then(() => a.pause())
      .catch(() => {});
    audioRef.current = a;
    setPret(true);
  }

  async function envoyer(e) {
    e.preventDefault();
    const texte = reponse.trim();
    if (!texte || etat?.statut !== "playing") return;
    setReponse("");
    const r = await fetch(`/api/rooms/${code}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texte }),
    });
    const d = await r.json();
    if (d.accepte) {
      setFlash({
        ok: true,
        texte: d.parties.map((p) => `${p.partie} +${p.points}`).join(" · "),
      });
    } else {
      setFlash({ ok: false, texte: "Raté !" });
    }
    setTimeout(() => setFlash(null), 1600);
    inputRef.current?.focus();
  }

  // Quitter : la musique s'arrête tout de suite pour celui qui part.
  // Si c'est l'animatrice, la partie se termine pour tout le monde.
  async function quitter() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    clearTimeout(minuteurRef.current);
    try {
      await fetch(`/api/rooms/${code}/leave`, { method: "POST" });
    } catch {
      // même en cas de souci réseau, on laisse la personne partir
    }
    router.push("/salon");
  }

  async function action(a, extra = {}) {
    await fetch(`/api/rooms/${code}/host`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: a, ...extra }),
    });
  }

  if (erreur) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-7xl">😕</div>
        <p className="text-2xl font-semibold text-red-300">{erreur}</p>
        <Link href="/salon" className="rounded-full bg-zinc-800 px-8 py-4 font-bold">
          ← Retour
        </Link>
      </main>
    );
  }

  if (!etat) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-jenny-line border-t-jenny" />
      </main>
    );
  }

  // Temps restant, calculé sur l'horloge du serveur
  const finLocale = etat.finManche
    ? new Date(etat.finManche).getTime() - decalageRef.current
    : 0;
  const debutLocal = etat.debutManche
    ? new Date(etat.debutManche).getTime() - decalageRef.current
    : 0;
  const duree = etat.debutManche
    ? (new Date(etat.finManche) - new Date(etat.debutManche)) / 1000
    : 30;
  // Avant que la musique parte : décompte visible.
  const avantDebut = (debutLocal - Date.now()) / 1000;
  const enDecompte = etat.statut === "playing" && avantDebut > 0;
  const restant = Math.min(
    duree,
    Math.max(0, (finLocale - Date.now()) / 1000)
  );
  const progression = duree ? (restant / duree) * 100 : 0;
  const trouve = etat.moi?.trouve || {};
  const champs = etat.champs || {};
  const enJeu = etat.statut === "playing";
  const jePeuxJouer = !etat.estHote || etat.hoteJoue;

  // --- Écran d'entrée : le clic autorise le son du navigateur ---
  if (!pret) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
        <div>
          <div className="mb-4 text-7xl">🎉</div>
          <h1 className="text-4xl font-black">{etat.nom}</h1>
          <p className="mt-2 text-xl text-zinc-400">
            Salon <span className="font-black tracking-widest text-jenny-light">{etat.code}</span>
            {" · "}
            {etat.joueurs.length} joueur{etat.joueurs.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={entrer}
          className="rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-14 py-6 text-3xl font-black text-white shadow-lg shadow-jenny/40 transition hover:scale-105 animate-pop"
        >
          Je suis prêt ! 🔊
        </button>
        <p className="max-w-md text-sm text-zinc-500">
          Chacun écoute la musique sur son propre appareil : monte le son.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      {/* Bandeau */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-sm text-zinc-500">Salon</span>{" "}
          <span className="text-2xl font-black tracking-widest text-jenny-light">
            {etat.code}
          </span>
        </div>
        <div className="text-lg font-bold text-zinc-300">
          {etat.statut === "lobby"
            ? "Salle d'attente"
            : etat.statut === "ended"
              ? "Partie terminée"
              : `Musique ${etat.manche + 1} / ${etat.total}`}
        </div>
        <div className="flex items-center gap-2">
          {etat.estHote && (
            <Link
              href={`/salon/${code}/stream`}
              target="_blank"
              className="rounded-full bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-700"
            >
              📺 Vue stream
            </Link>
          )}
          {etat.estHote && etat.statut !== "ended" ? (
            confirmQuitter ? (
              <div className="flex items-center gap-1 rounded-full bg-red-950/60 p-1 ring-1 ring-red-800">
                <span className="px-2 text-xs font-bold text-red-200">
                  Fermer pour tous ?
                </span>
                <button
                  onClick={quitter}
                  className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white"
                >
                  Oui
                </button>
                <button
                  onClick={() => setConfirmQuitter(false)}
                  className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold"
                >
                  Non
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmQuitter(true)}
                className="rounded-full bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-700"
              >
                ✕ Fermer la partie
              </button>
            )
          ) : (
            <button
              onClick={quitter}
              className="rounded-full bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-700"
            >
              ✕ Quitter
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <VolumeSlider
          className="w-full"
          onChange={(v) => {
            if (audioRef.current) audioRef.current.volume = v;
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* --- Zone de jeu --- */}
        <div className="flex flex-col gap-4">
          {etat.statut === "lobby" && (
            <div className="rounded-2xl bg-jenny-surface/60 p-8 text-center ring-1 ring-jenny-line">
              <p className="text-lg text-zinc-400">Code du salon</p>
              <p className="my-4 text-7xl font-black tracking-[0.2em] text-gradient">
                {etat.code}
              </p>
              <p className="text-zinc-400">
                En attente du lancement par l'animatrice…
              </p>
            </div>
          )}

          {/* Décompte avant que la musique démarre */}
          {enDecompte && (
            <div className="rounded-2xl bg-jenny-surface/60 p-8 text-center ring-1 ring-jenny-line">
              <p className="text-2xl font-bold text-zinc-400">
                {etat.manche === 0 ? "La partie commence dans…" : "Prochaine musique dans…"}
              </p>
              <div
                key={Math.ceil(avantDebut)}
                className="mt-4 text-9xl font-black text-gradient animate-pop"
              >
                {Math.ceil(avantDebut)}
              </div>
              <p className="mt-3 text-sm text-zinc-500">Prépare tes doigts ! 🎧</p>
            </div>
          )}

          {(enJeu || etat.statut === "paused") && !enDecompte && (
            <div className="rounded-2xl bg-jenny-surface/60 p-6 ring-1 ring-jenny-line">
              <div className="text-center">
                <div className="text-6xl">{etat.statut === "paused" ? "⏸️" : "🎶"}</div>
                <p className="mt-2 text-xl font-bold text-zinc-300">
                  {etat.statut === "paused"
                    ? "Pause"
                    : "Devine " +
                      [champs.titre && "le titre", champs.artiste && "l'artiste", champs.film && "le film"]
                        .filter(Boolean)
                        .join(" et ")}
                </p>
              </div>

              <div className="mt-4 flex justify-center gap-3">
                {champs.titre && (
                  <span className={`rounded-xl px-4 py-2 text-sm font-bold ring-1 ${trouve.titre ? "bg-jenny/20 text-jenny-light ring-jenny" : "bg-zinc-900 text-zinc-300 ring-jenny-line"}`}>
                    🎵 Titre {trouve.titre ? "✓" : `${etat.bareme?.titre} pts`}
                  </span>
                )}
                {champs.artiste && (
                  <span className={`rounded-xl px-4 py-2 text-sm font-bold ring-1 ${trouve.artiste ? "bg-jenny/20 text-jenny-light ring-jenny" : "bg-zinc-900 text-zinc-300 ring-jenny-line"}`}>
                    🎤 Artiste {trouve.artiste ? "✓" : `${etat.bareme?.artiste} pts`}
                  </span>
                )}
                {champs.film && (
                  <span className={`rounded-xl px-4 py-2 text-sm font-bold ring-1 ${trouve.film ? "bg-jenny/20 text-jenny-light ring-jenny" : "bg-zinc-900 text-zinc-300 ring-jenny-line"}`}>
                    🎬 Film {trouve.film ? "✓" : `${etat.bareme?.film} pts`}
                  </span>
                )}
              </div>

              <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${restant > duree * 0.5 ? "bg-jenny" : restant > duree * 0.25 ? "bg-yellow-400" : "bg-red-500"}`}
                  style={{ width: `${progression}%` }}
                />
              </div>
              <p className="mt-1 text-center text-2xl font-black tabular-nums">
                {Math.ceil(restant)}s
              </p>
              <p className="mt-1 text-center text-sm text-zinc-500">
                Plus tu réponds vite, plus tu marques de points
              </p>
            </div>
          )}

          {etat.statut === "reveal" && etat.morceau && (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-jenny-surface/60 p-6 text-center ring-1 ring-jenny-line animate-pop">
              {etat.morceau.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={etat.morceau.image} alt="" className="h-40 w-40 rounded-2xl shadow-2xl" />
              )}
              <div className="text-3xl font-black">{etat.morceau.name}</div>
              <div className="text-xl text-zinc-400">{etat.morceau.artists}</div>
              {etat.morceau.film && (
                <div className="text-lg font-semibold text-jenny-light">🎬 {etat.morceau.film}</div>
              )}
              {!etat.autoNext && (
                <p className="mt-2 text-sm text-zinc-500">
                  En attente de la chanson suivante…
                </p>
              )}
            </div>
          )}

          {etat.statut === "ended" && (
            <div className="rounded-2xl bg-jenny-surface/60 p-8 text-center ring-1 ring-jenny-line">
              {etat.fermeParHote && !etat.estHote ? (
                <>
                  <div className="text-6xl">🚪</div>
                  <h2 className="mt-3 text-2xl font-black text-red-300">
                    Le créateur du salon a fermé la partie
                  </h2>
                  <p className="mt-2 text-zinc-400">
                    Voici le classement au moment de la fermeture.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-6xl">🏁</div>
                  <h2 className="mt-2 text-3xl font-black text-gradient">Podium</h2>
                </>
              )}
              <div className="mt-6 flex flex-col gap-2">
                {etat.joueurs.slice(0, 10).map((j, i) => (
                  <div
                    key={j.pseudo}
                    className={`flex items-center justify-between rounded-xl px-5 py-3 ring-1 ${i === 0 ? "bg-jenny/20 ring-jenny" : "bg-zinc-900/60 ring-jenny-line"}`}
                  >
                    <span className="font-bold">
                      {["🥇", "🥈", "🥉"][i] || `${i + 1}.`} {j.pseudo}
                    </span>
                    <span className="font-black text-jenny-light">{j.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barre de réponse */}
          {jePeuxJouer && (enJeu || etat.statut === "paused") && (
            <form onSubmit={envoyer}>
              {flash && (
                <p className={`mb-2 text-center font-bold ${flash.ok ? "text-jenny-light" : "text-red-400"}`}>
                  {flash.texte}
                </p>
              )}
              <input
                ref={inputRef}
                value={reponse}
                onChange={(e) => setReponse(e.target.value)}
                disabled={!enJeu || enDecompte}
                placeholder={
                  enDecompte
                    ? "Attends le départ…"
                    : enJeu
                      ? "Ta réponse…"
                      : "En pause"
                }
                autoComplete="off"
                className="w-full rounded-2xl border-4 border-jenny/50 bg-zinc-900 px-6 py-5 text-center text-2xl font-bold text-white placeholder-zinc-600 outline-none transition focus:border-jenny disabled:opacity-40"
              />
            </form>
          )}
        </div>

        {/* --- Classement + panneau animatrice --- */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-jenny-surface/60 p-4 ring-1 ring-jenny-line">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-500">
              Classement ({etat.joueurs.length})
            </h3>
            <div className="flex flex-col gap-1">
              {etat.joueurs.map((j, i) => (
                <div
                  key={j.pseudo}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${j.estMoi ? "bg-jenny/15 font-bold" : ""}`}
                >
                  <span className="truncate">
                    {i + 1}. {j.pseudo} {j.estMoi && "(toi)"}
                  </span>
                  <span className="font-black text-jenny-light">{j.score}</span>
                </div>
              ))}
            </div>
          </div>

          {etat.estHote && (
            <div className="rounded-2xl bg-jenny-surface/60 p-4 ring-1 ring-jenny-line">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-jenny-light">
                🎤 Contrôle
              </h3>

              <div className="flex flex-col gap-2">
                {etat.statut === "lobby" && (
                  <button
                    onClick={() => action("demarrer")}
                    className="rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-4 py-3 font-black text-white"
                  >
                    ▶️ Lancer la partie
                  </button>
                )}

                {etat.statut !== "lobby" && etat.statut !== "ended" && (
                  <>
                    <button
                      onClick={() => action("suivante")}
                      className="rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-4 py-3 font-black text-white"
                    >
                      ⏭️ Chanson suivante
                    </button>
                    {etat.statut === "playing" ? (
                      <button onClick={() => action("pause")} className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-bold">
                        ⏸️ Pause
                      </button>
                    ) : etat.statut === "paused" ? (
                      <button onClick={() => action("reprendre")} className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-bold">
                        ▶️ Reprendre
                      </button>
                    ) : null}
                    <button
                      onClick={() => setRevele((v) => !v)}
                      className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-bold"
                    >
                      {revele ? "🙈 Masquer la réponse" : "👁️ Voir la réponse"}
                    </button>
                    {revele && etat.morceau?.name && (
                      <p className="rounded-lg bg-zinc-900 p-2 text-xs text-zinc-300">
                        {etat.morceau.name} — {etat.morceau.artists}
                        {etat.morceau.film ? ` — 🎬 ${etat.morceau.film}` : ""}
                      </p>
                    )}
                  </>
                )}

                <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-zinc-900/60 p-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={etat.autoNext}
                    onChange={(e) => action("autoNext", { valeur: e.target.checked })}
                    className="h-4 w-4 accent-[#a78bee]"
                  />
                  Chanson suivante automatique
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-zinc-900/60 p-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={etat.verrouille}
                    onChange={(e) => action("verrouiller", { valeur: e.target.checked })}
                    className="h-4 w-4 accent-[#a78bee]"
                  />
                  Verrouiller le salon
                </label>

                {etat.statut !== "ended" && (
                  <button
                    onClick={() => action("terminer")}
                    className="rounded-full bg-red-950/60 px-4 py-2 text-sm font-bold text-red-300 ring-1 ring-red-800"
                  >
                    ⏹️ Terminer
                  </button>
                )}
              </div>

              {/* Validation manuelle */}
              {etat.aArbitrer?.length > 0 && enJeu && (
                <div className="mt-4">
                  <h4 className="mb-2 text-xs font-bold uppercase text-zinc-500">
                    Réponses refusées
                  </h4>
                  <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                    {etat.aArbitrer.map((a) => (
                      <div key={a.id} className="rounded-lg bg-zinc-900/60 p-2">
                        <p className="truncate text-xs">
                          <span className="font-bold text-zinc-300">{a.pseudo}</span>{" "}
                          <span className="text-zinc-400">« {a.texte} »</span>
                        </p>
                        <div className="mt-1 flex gap-1">
                          {champs.titre && (
                            <button onClick={() => action("accepter", { answerId: a.id, partie: "titre" })} className="rounded bg-jenny/20 px-2 py-1 text-[10px] font-bold text-jenny-light">
                              ✅ Titre
                            </button>
                          )}
                          {champs.artiste && (
                            <button onClick={() => action("accepter", { answerId: a.id, partie: "artiste" })} className="rounded bg-jenny/20 px-2 py-1 text-[10px] font-bold text-jenny-light">
                              ✅ Artiste
                            </button>
                          )}
                          {champs.film && (
                            <button onClick={() => action("accepter", { answerId: a.id, partie: "film" })} className="rounded bg-jenny/20 px-2 py-1 text-[10px] font-bold text-jenny-light">
                              ✅ Film
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
