"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Petit bandeau de compte, affiché en haut des pages.
export default function CompteLien({ className = "" }) {
  const [etat, setEtat] = useState(null); // null = en cours de vérification

  useEffect(() => {
    let annule = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!annule) setEtat(d);
      })
      .catch(() => {
        if (!annule) setEtat({ connecte: false });
      });
    return () => {
      annule = true;
    };
  }, []);

  if (!etat) return <div className={className} />;

  if (etat.connecte) {
    const ecusson =
      etat.role === "admin" ? "🛡️" : etat.role === "animateur" ? "🎤" : "";
    return (
      <Link
        href="/compte"
        title={
          etat.role === "admin"
            ? "Administrateur"
            : etat.role === "animateur"
              ? "Animateur"
              : "Joueur"
        }
        className={`rounded-full bg-jenny/15 px-5 py-2 text-sm font-bold text-jenny-light ring-1 ring-jenny/40 transition hover:bg-jenny/25 ${className}`}
      >
        {ecusson || "🐨"} {etat.pseudo}
      </Link>
    );
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <Link
        href="/connexion"
        className="rounded-full bg-zinc-800 px-5 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700"
      >
        Connexion
      </Link>
      <Link
        href="/inscription"
        className="rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-5 py-2 text-sm font-bold text-white transition hover:brightness-110"
      >
        Créer un compte
      </Link>
    </div>
  );
}
