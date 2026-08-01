"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const LIBELLES = {
  joueur: { nom: "Joueur", emoji: "🎮", aide: "Joue en solo, rejoint les salons" },
  animateur: {
    nom: "Animateur",
    emoji: "🎤",
    aide: "Peut créer et diriger des salons",
  },
  admin: {
    nom: "Admin",
    emoji: "🛡️",
    aide: "Peut aussi donner et retirer les rôles",
  },
};

export default function AdminPage() {
  const router = useRouter();
  const [comptes, setComptes] = useState(null);
  const [moi, setMoi] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(null);

  async function charger() {
    const r = await fetch("/api/admin/users");
    if (r.status === 403) {
      router.replace("/");
      return;
    }
    const d = await r.json();
    setComptes(d.comptes || []);
    setMoi(d.moi || null);
  }

  useEffect(() => {
    charger().catch(() => setErreur("Chargement impossible."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changerRole(userId, role, pseudo) {
    setMessage(null);
    setErreur(null);
    const r = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErreur(d.error);
      return;
    }
    setMessage(`${pseudo} est maintenant ${LIBELLES[role].nom.toLowerCase()}.`);
    charger();
  }

  if (comptes === null) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-jenny-line border-t-jenny" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-black">
          🛡️ <span className="text-gradient">Administration</span>
        </h1>
        <Link
          href="/compte"
          className="rounded-full bg-zinc-800 px-5 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700"
        >
          ← Mon compte
        </Link>
      </header>

      <div className="mb-6 rounded-2xl bg-jenny-surface/60 p-5 ring-1 ring-jenny-line">
        <p className="text-sm text-zinc-400">
          Donne le rôle <strong className="text-jenny-light">Animateur</strong> à
          JennyyL pour qu'elle puisse créer et diriger des salons multijoueur.
          Elle doit d'abord avoir créé son compte elle-même sur le site.
        </p>
      </div>

      {message && (
        <p className="mb-4 rounded-xl bg-jenny/15 p-3 font-semibold text-jenny-light ring-1 ring-jenny/40">
          {message}
        </p>
      )}
      {erreur && (
        <p className="mb-4 rounded-xl bg-red-950/60 p-3 font-semibold text-red-300 ring-1 ring-red-800">
          {erreur}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {comptes.map((c) => {
          const info = LIBELLES[c.role] || LIBELLES.joueur;
          const cestMoi = c.id === moi?.userId;
          return (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-jenny-surface/60 p-4 ring-1 ring-jenny-line"
            >
              <div className="min-w-0">
                <div className="truncate text-lg font-bold">
                  {c.pseudo}
                  {cestMoi && (
                    <span className="ml-2 text-xs font-semibold text-zinc-500">
                      (toi)
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500">
                  {info.emoji} {info.nom} — {info.aide}
                </div>
              </div>
              <div className="flex shrink-0 gap-1 rounded-full bg-zinc-900 p-1 ring-1 ring-jenny-line">
                {["joueur", "animateur", "admin"].map((r) => (
                  <button
                    key={r}
                    onClick={() => changerRole(c.id, r, c.pseudo)}
                    disabled={c.role === r || (cestMoi && r !== "admin")}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                      c.role === r
                        ? "bg-gradient-to-r from-jenny to-jenny-pink text-white"
                        : "text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400"
                    }`}
                  >
                    {LIBELLES[r].emoji} {LIBELLES[r].nom}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
