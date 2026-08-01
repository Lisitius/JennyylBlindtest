"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { postJson } from "@/lib/api";

function Formulaire() {
  const router = useRouter();
  const params = useSearchParams();
  const jeton = params.get("jeton");

  const [etat, setEtat] = useState("verification"); // verification|valide|invalide
  const [pseudo, setPseudo] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  // Jeton fourni par l'emailing intégré de Supabase (transmis dans l'adresse
  // après le #, donc lisible uniquement côté navigateur).
  const [jetonSupabase, setJetonSupabase] = useState(null);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const acces = params.get("access_token");
      if (acces) {
        setJetonSupabase(acces);
        setEtat("valide");
        // On nettoie l'adresse pour ne pas laisser traîner le jeton.
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }
    }
    if (hash.includes("error")) {
      setEtat("invalide");
      return;
    }

    if (!jeton) {
      setEtat("invalide");
      return;
    }
    fetch(`/api/auth/reset?jeton=${encodeURIComponent(jeton)}`)
      .then((r) => r.json())
      .then((d) => {
        setEtat(d.valide ? "valide" : "invalide");
        if (d.pseudo) setPseudo(d.pseudo);
      })
      .catch(() => setEtat("invalide"));
  }, [jeton]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne sont pas identiques.");
      return;
    }
    setEnvoi(true);
    try {
      // Deux origines possibles pour le lien : notre propre email (Brevo)
      // ou celui envoyé par Supabase.
      if (jetonSupabase) {
        await postJson("/api/auth/reset-supabase", {
          accessToken: jetonSupabase,
          motDePasse,
        });
      } else {
        await postJson("/api/auth/reset", { jeton, motDePasse });
      }
      router.push("/compte");
      router.refresh();
    } catch (e2) {
      setErreur(e2.message);
      setEnvoi(false);
    }
  }

  const champ =
    "w-full rounded-2xl border-2 border-jenny-line bg-zinc-900/60 px-5 py-3 text-lg font-semibold text-white placeholder-zinc-500 outline-none transition focus:border-jenny";

  if (etat === "verification") {
    return (
      <div className="flex justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-jenny-line border-t-jenny" />
      </div>
    );
  }

  if (etat === "invalide") {
    return (
      <div className="rounded-2xl bg-jenny-surface/60 p-6 text-center ring-1 ring-jenny-line">
        <p className="text-5xl">⏳</p>
        <p className="mt-4 text-lg font-bold text-red-300">
          Ce lien n'est plus valable
        </p>
        <p className="mt-2 text-zinc-400">
          Il a expiré (30 minutes) ou a déjà été utilisé. Refais une demande,
          c'est immédiat.
        </p>
        <Link
          href="/mot-de-passe-oublie"
          className="mt-6 inline-block rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-8 py-3 font-bold text-white"
        >
          Nouvelle demande
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl bg-jenny-surface/60 p-6 ring-1 ring-jenny-line animate-fadein"
    >
      <p className="text-zinc-300">
        {pseudo ? (
          <>
            Bonjour <strong className="text-white">{pseudo}</strong>, choisis ton
            nouveau mot de passe.
          </>
        ) : (
          "Choisis ton nouveau mot de passe."
        )}
      </p>
      <input
        type="password"
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
        placeholder="Nouveau mot de passe"
        autoComplete="new-password"
        required
        className={champ}
      />
      <input
        type="password"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        placeholder="Confirme le mot de passe"
        autoComplete="new-password"
        required
        className={champ}
      />
      <p className="text-xs text-zinc-500">
        8 caractères minimum, avec au moins une lettre et un chiffre.
      </p>
      {erreur && (
        <p className="rounded-xl bg-red-950/60 p-3 text-sm font-semibold text-red-300 ring-1 ring-red-800">
          {erreur}
        </p>
      )}
      <button
        disabled={envoi}
        className="rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-8 py-4 text-xl font-black text-white shadow-lg shadow-jenny/40 transition hover:scale-[1.02] disabled:opacity-50"
      >
        {envoi ? "Enregistrement…" : "Valider et me connecter"}
      </button>
    </form>
  );
}

export default function Reinitialiser() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <div className="mb-3 text-6xl">🔑</div>
        <h1 className="text-4xl font-black">
          <span className="text-gradient">Nouveau mot de passe</span>
        </h1>
      </div>
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-jenny-line border-t-jenny" />
          </div>
        }
      >
        <Formulaire />
      </Suspense>
    </main>
  );
}
