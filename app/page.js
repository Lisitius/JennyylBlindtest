"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import CompteLien from "@/components/CompteLien";

export default function HomePage() {
  const router = useRouter();
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-10 px-6">
      <div className="absolute right-6 top-6">
        <CompteLien />
      </div>
      <div className="text-center animate-fadein">
        {/* Mascotte koala + monogramme JK */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <span className="text-8xl animate-float">🐨</span>
          <span className="jk-logo text-8xl font-black tracking-tight">JK</span>
        </div>

        <h1 className="text-6xl font-black tracking-tight">
          <span className="text-gradient">BLINDTEST</span>
        </h1>
        <p className="mt-4 text-xl text-jenny-light/90">
          Le blindtest musical de{" "}
          <span className="font-bold text-white">JennyyL</span> 🎧
        </p>
      </div>

      <button
        onClick={() => router.push("/playlists")}
        className="rounded-full bg-gradient-to-r from-jenny to-jenny-pink px-14 py-6 text-3xl font-black text-white shadow-lg shadow-jenny/40 transition hover:scale-105 hover:brightness-110 animate-pop"
      >
        Jouer →
      </button>

      <p className="text-sm text-jenny-light/50">
        Extraits musicaux Deezer ·{" "}
        <Link href="/regles" className="underline hover:text-jenny-light">
          Règles & confidentialité
        </Link>
      </p>
    </main>
  );
}
