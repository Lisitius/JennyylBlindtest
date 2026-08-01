"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const MODES = {
  full: "Titre + artiste",
  title: "Titre seul",
  "title-film": "Titre + film",
  film: "Film seul",
};

function Carte({ titre, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl bg-jenny-surface/60 p-6 ring-1 ring-jenny-line ${className}`}
    >
      <h2 className="mb-4 text-xl font-bold text-zinc-300">{titre}</h2>
      {children}
    </section>
  );
}

function Stat({ valeur, libelle }) {
  return (
    <div className="rounded-xl bg-zinc-900/60 p-4 text-center ring-1 ring-jenny-line">
      <div className="text-3xl font-black text-gradient">{valeur}</div>
      <div className="mt-1 text-xs font-semibold text-zinc-400">{libelle}</div>
    </div>
  );
}

export default function ComptePage() {
  const router = useRouter();
  const [profil, setProfil] = useState(null);
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);

  const [pseudo, setPseudo] = useState("");
  const [msgPseudo, setMsgPseudo] = useState(null);
  const [mdp, setMdp] = useState("");
  const [msgMdp, setMsgMdp] = useState(null);
  const [confirmSuppr, setConfirmSuppr] = useState(false);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/me");
        const d = await r.json();
        if (!d.connecte) {
          router.replace("/connexion");
          return;
        }
        if (annule) return;
        setProfil(d);
        setPseudo(d.pseudo);
        const g = await fetch("/api/account/games");
        const gd = await g.json();
        if (!annule) setDonnees(gd);
      } finally {
        if (!annule) setChargement(false);
      }
    })();
    return () => {
      annule = true;
    };
  }, [router]);

  async function majPseudo(e) {
    e.preventDefault();
    setMsgPseudo(null);
    const r = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pseudo }),
    });
    const d = await r.json();
    setMsgPseudo(
      r.ok
        ? { ok: true, texte: "Pseudo mis à jour ✅" }
        : { ok: false, texte: d.error }
    );
    if (r.ok) setProfil((p) => ({ ...p, pseudo }));
  }

  async function majMdp(e) {
    e.preventDefault();
    setMsgMdp(null);
    const r = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motDePasse: mdp }),
    });
    const d = await r.json();
    setMsgMdp(
      r.ok
        ? { ok: true, texte: "Mot de passe modifié ✅" }
        : { ok: false, texte: d.error }
    );
    if (r.ok) setMdp("");
  }

  async function supprimer() {
    const r = await fetch("/api/account", { method: "DELETE" });
    if (r.ok) {
      router.push("/");
      router.refresh();
    }
  }

  async function deconnexion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (chargement) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-jenny-line border-t-jenny" />
      </main>
    );
  }
  if (!profil) return null;

  const stats = donnees?.stats;
  const parties = donnees?.parties || [];
  const champ =
    "w-full rounded-2xl border-2 border-jenny-line bg-zinc-900/60 px-5 py-3 font-semibold text-white placeholder-zinc-500 outline-none transition focus:border-jenny";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">
            🐨 <span className="text-gradient">{profil.pseudo}</span>
          </h1>
          {profil.membreDepuis && (
            <p className="mt-1 text-sm text-zinc-500">
              Membre depuis le{" "}
              {new Date(profil.membreDepuis).toLocaleDateString("fr-FR")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {profil.estAdmin && (
            <Link
              href="/admin"
              className="rounded-full bg-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700"
            >
              🛡️ Administration
            </Link>
          )}
          <Link
            href="/salon"
            className="rounded-full bg-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700"
          >
            🎉 Partie entre amis
          </Link>
          <Link
            href="/playlists"
            className="rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-6 py-3 font-bold text-white transition hover:brightness-110"
          >
            🎮 Jouer
          </Link>
          <button
            onClick={deconnexion}
            className="rounded-full bg-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Statistiques */}
      <Carte titre="📊 Mes statistiques" className="mb-6 animate-fadein">
        {stats && stats.partiesJouees > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat valeur={stats.partiesJouees} libelle="parties jouées" />
              <Stat valeur={`${stats.pourcentMoyen}%`} libelle="réussite moyenne" />
              <Stat
                valeur={`${stats.meilleurScore}/${stats.meilleurMax}`}
                libelle="meilleur score"
              />
              <Stat valeur={stats.chansonsJouees} libelle="chansons écoutées" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Stat valeur={stats.titresTrouves} libelle="🎵 titres trouvés" />
              <Stat valeur={stats.artistesTrouves} libelle="🎤 artistes trouvés" />
              <Stat valeur={stats.filmsTrouves} libelle="🎬 films trouvés" />
            </div>
            {stats.themeFavori && (
              <p className="mt-4 text-center text-zinc-400">
                Thème favori :{" "}
                <span className="font-bold text-white">{stats.themeFavori}</span>
              </p>
            )}
          </>
        ) : (
          <p className="text-zinc-400">
            Aucune partie enregistrée pour l'instant.{" "}
            <Link href="/playlists" className="font-bold text-jenny-light underline">
              Lance ta première partie !
            </Link>
          </p>
        )}
      </Carte>

      {/* Records par thème */}
      {stats?.themes?.length > 0 && (
        <Carte titre="🏆 Mes records par thème" className="mb-6 animate-fadein">
          <div className="flex flex-col gap-2">
            {stats.themes.slice(0, 8).map((t) => (
              <div
                key={t.nom}
                className="flex items-center justify-between rounded-xl bg-zinc-900/60 px-4 py-3 ring-1 ring-jenny-line"
              >
                <span className="truncate font-bold">{t.nom}</span>
                <span className="shrink-0 text-sm text-zinc-400">
                  {t.parties} partie{t.parties > 1 ? "s" : ""} ·{" "}
                  <span className="font-black text-jenny-light">
                    {t.meilleurScore}/{t.max}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Carte>
      )}

      {/* Historique */}
      <Carte titre="📜 Historique des parties" className="mb-6 animate-fadein">
        {parties.length === 0 ? (
          <p className="text-zinc-400">Rien à afficher pour le moment.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {parties.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-900/60 px-4 py-3 ring-1 ring-jenny-line"
              >
                <div className="min-w-0">
                  <div className="truncate font-bold">
                    {p.source_name || "Blindtest"}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {new Date(p.played_at).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                    {" · "}
                    {MODES[p.mode] || p.mode}
                    {" · "}
                    {p.nb_tracks} titres · {p.round_seconds}s
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-zinc-400">
                    🎵 {p.titles_found}
                    {p.artists_found > 0 && ` · 🎤 ${p.artists_found}`}
                    {p.films_found > 0 && ` · 🎬 ${p.films_found}`}
                  </span>
                  <span className="rounded-full bg-jenny px-4 py-1 text-sm font-black text-white">
                    {p.score}/{p.max_points}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Carte>

      {/* Réglages du compte */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Carte titre="✏️ Changer de pseudo">
          <form onSubmit={majPseudo} className="flex flex-col gap-3">
            <input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className={champ}
              required
            />
            {msgPseudo && (
              <p
                className={`text-sm font-semibold ${
                  msgPseudo.ok ? "text-jenny-light" : "text-red-400"
                }`}
              >
                {msgPseudo.texte}
              </p>
            )}
            <button className="rounded-full bg-zinc-800 px-6 py-3 font-bold transition hover:bg-zinc-700">
              Enregistrer
            </button>
          </form>
        </Carte>

        <Carte titre="🔑 Changer de mot de passe">
          <form onSubmit={majMdp} className="flex flex-col gap-3">
            <input
              type="password"
              value={mdp}
              onChange={(e) => setMdp(e.target.value)}
              placeholder="Nouveau mot de passe"
              autoComplete="new-password"
              className={champ}
              required
            />
            {msgMdp && (
              <p
                className={`text-sm font-semibold ${
                  msgMdp.ok ? "text-jenny-light" : "text-red-400"
                }`}
              >
                {msgMdp.texte}
              </p>
            )}
            <button className="rounded-full bg-zinc-800 px-6 py-3 font-bold transition hover:bg-zinc-700">
              Modifier
            </button>
          </form>
        </Carte>
      </div>

      {/* Données personnelles */}
      <Carte titre="🔒 Mes données" className="mb-6">
        <p className="mb-4 text-sm text-zinc-400">
          Ton mot de passe n'est jamais conservé en clair. Seuls ton pseudo, ton
          email et l'historique de tes parties sont enregistrés — ni partagés, ni
          revendus.{" "}
          <Link href="/regles" className="font-bold text-jenny-light underline">
            Voir le détail
          </Link>
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/account/export"
            className="rounded-full bg-zinc-800 px-6 py-3 font-bold text-zinc-200 transition hover:bg-zinc-700"
          >
            📥 Télécharger mes données
          </a>
          {!confirmSuppr ? (
            <button
              onClick={() => setConfirmSuppr(true)}
              className="rounded-full bg-red-950/60 px-6 py-3 font-bold text-red-300 ring-1 ring-red-800 transition hover:bg-red-900/60"
            >
              🗑️ Supprimer mon compte
            </button>
          ) : (
            <div className="flex w-full flex-col gap-3 rounded-xl bg-red-950/40 p-4 ring-1 ring-red-800">
              <p className="font-bold text-red-200">
                Supprimer définitivement ton compte, ton historique et tes
                statistiques ? Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={supprimer}
                  className="rounded-full bg-red-600 px-6 py-3 font-black text-white transition hover:bg-red-500"
                >
                  Oui, tout supprimer
                </button>
                <button
                  onClick={() => setConfirmSuppr(false)}
                  className="rounded-full bg-zinc-800 px-6 py-3 font-bold transition hover:bg-zinc-700"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </Carte>
    </main>
  );
}
