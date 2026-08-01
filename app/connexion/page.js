"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, motDePasse }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Connexion impossible.");
      router.push("/playlists");
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
          <span className="text-gradient">Connexion</span>
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl bg-jenny-surface/60 p-6 ring-1 ring-jenny-line animate-fadein"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-zinc-300">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            autoComplete="current-password"
            className={champ}
            required
          />
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
          {envoi ? "Connexion…" : "Se connecter"}
        </button>

        <Link
          href="/mot-de-passe-oublie"
          className="text-center text-sm text-zinc-400 underline hover:text-jenny-light"
        >
          Mot de passe oublié ?
        </Link>
      </form>

      <p className="mt-6 text-center text-zinc-400">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-bold text-jenny-light underline">
          S'inscrire
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
