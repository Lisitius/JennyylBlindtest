"use client";

import { useState } from "react";
import Link from "next/link";

export default function MotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const r = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Envoi impossible.");
      setEnvoye(true);
    } catch (e2) {
      setErreur(e2.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center animate-fadein">
        <div className="mb-3 text-6xl">🔑</div>
        <h1 className="text-4xl font-black">
          <span className="text-gradient">Mot de passe oublié</span>
        </h1>
      </div>

      {envoye ? (
        <div className="rounded-2xl bg-jenny-surface/60 p-6 text-center ring-1 ring-jenny-line animate-fadein">
          <p className="text-lg font-bold text-jenny-light">
            📬 C'est envoyé !
          </p>
          <p className="mt-3 text-zinc-300">
            Si un compte existe avec cette adresse, tu vas recevoir un email
            avec un lien pour choisir un nouveau mot de passe.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            Le lien est valable 30 minutes. Pense à regarder dans tes courriers
            indésirables.
          </p>
          <Link
            href="/connexion"
            className="mt-6 inline-block rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-8 py-3 font-bold text-white"
          >
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl bg-jenny-surface/60 p-6 ring-1 ring-jenny-line animate-fadein"
        >
          <p className="text-sm text-zinc-400">
            Indique l'adresse email de ton compte : on t'enverra un lien pour
            choisir un nouveau mot de passe.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.fr"
            autoComplete="email"
            required
            className="w-full rounded-2xl border-2 border-jenny-line bg-zinc-900/60 px-5 py-3 text-lg font-semibold text-white placeholder-zinc-500 outline-none transition focus:border-jenny"
          />
          {erreur && (
            <p className="rounded-xl bg-red-950/60 p-3 text-sm font-semibold text-red-300 ring-1 ring-red-800">
              {erreur}
            </p>
          )}
          <button
            disabled={envoi}
            className="rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-8 py-4 text-xl font-black text-white shadow-lg shadow-jenny/40 transition hover:scale-[1.02] disabled:opacity-50"
          >
            {envoi ? "Envoi…" : "Envoyer le lien"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center">
        <Link href="/connexion" className="text-sm text-zinc-500 underline">
          ← Retour à la connexion
        </Link>
      </p>
    </main>
  );
}
