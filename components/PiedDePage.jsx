"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Bandeau discret affiché en bas du site.
// Masqué pendant les parties : l'écran de jeu doit rester dégagé.
const SANS_BANDEAU = ["/game", "/salon/"];

export default function PiedDePage() {
  const chemin = usePathname() || "";
  if (SANS_BANDEAU.some((p) => chemin.startsWith(p))) return null;

  return (
    <footer className="border-t border-jenny-line/60 px-6 py-4 text-center text-xs text-zinc-600">
      <p>
        © {new Date().getFullYear()} Jennyyl-blindtest · Tous droits réservés à
        JennyyL ·{" "}
        <Link href="/regles" className="underline hover:text-jenny-light">
          Règles du jeu
        </Link>{" "}
        ·{" "}
        <Link
          href="/regles#mentions-legales"
          className="underline hover:text-jenny-light"
        >
          Mentions légales & confidentialité
        </Link>
      </p>
      <p className="mt-1">
        Extraits musicaux fournis par Deezer · Site non commercial, non affilié à
        Deezer ni aux ayants droit
      </p>
    </footer>
  );
}
