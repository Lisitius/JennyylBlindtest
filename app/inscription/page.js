"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { postJson } from "@/lib/api";

export default function InscriptionPage() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [conditions, setConditions] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await postJson("/api/auth/signup", { pseudo, email, motDePasse, conditions });
      router.push("/compte");
      router.refresh();
    } catch (e2) {
      setErreur(e2.message);
      setEnvoi(false);
    }
  }

  const champ =
    "w-full rounded-2xl border-2 border-jenny-line bg-jenny-surface/60 px-5 py-3 text-lg font-semibold text-white placeholder-zinc-500 outline-none transition focus:border-jenny";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center animate-fadein">
        <div className="mb-3 text-6xl">🐨</div>
        <h1 className="text-4xl font-black">
          <span className="text-gradient">Créer un compte</span>
        </h1>
        <p className="mt-2 text-zinc-400">
          Pour garder tes scores et ton historique de parties.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl bg-jenny-surface/60 p-6 ring-1 ring-jenny-line animate-fadein"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-zinc-300">Pseudo</span>
          <input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Ton pseudo dans le jeu"
            autoComplete="username"
            className={champ}
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-zinc-300">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pour retrouver ton compte"
            autoComplete="email"
            className={champ}
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-zinc-300">Mot de passe</span>
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            placeholder="8 caractères minimum, avec un chiffre"
            autoComplete="new-password"
            className={champ}
            required
          />
          <span className="text-xs text-zinc-500">
            Oublié plus tard ? Un lien de réinitialisation te sera envoyé par
            email.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-zinc-900/60 p-4 ring-1 ring-jenny-line">
          <input
            type="checkbox"
            checked={conditions}
            onChange={(e) => setConditions(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[#a78bee]"
            required
          />
          <span className="text-sm text-zinc-300">
            J'accepte les{" "}
            <Link
              href="/regles"
              target="_blank"
              className="font-bold text-jenny-light underline"
            >
              règles du site et la politique de confidentialité
            </Link>
            . Mon mot de passe est haché (jamais lisible), seuls mon pseudo et
            mon email sont conservés, et ils ne sont ni partagés ni revendus.
          </span>
        </label>

        {erreur && (
          <p className="rounded-xl bg-red-950/60 p-3 text-sm font-semibold text-red-300 ring-1 ring-red-800">
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={envoi}
          className="rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-8 py-4 text-xl font-black text-white shadow-lg shadow-jenny/40 transition hover:scale-[1.02] hover:brightness-110 disabled:opacity-50"
        >
          {envoi ? "Création…" : "Créer mon compte"}
        </button>
      </form>

      <p className="mt-6 text-center text-zinc-400">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-bold text-jenny-light underline">
          Se connecter
        </Link>
      </p>
      <p className="mt-2 text-center">
        <Link href="/" className="text-sm text-zinc-500 underline">
          ← Retour à l'accueil
        </Link>
      </p>
    </main>
  );
}
