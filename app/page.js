"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6">
      <div className="text-center animate-fadein">
        <div className="text-8xl mb-6">🎧</div>
        <h1 className="text-6xl font-black tracking-tight">BLINDTEST</h1>
        <p className="mt-4 text-xl text-zinc-400">
          Devine les chansons, marque des points
        </p>
      </div>

      <button
        onClick={() => router.push("/playlists")}
        className="rounded-full bg-spotify px-14 py-6 text-3xl font-black text-black transition hover:scale-105 hover:brightness-110 animate-pop"
      >
        Jouer →
      </button>

      <p className="text-sm text-zinc-600">
        Gratuit · Aucun compte requis · Extraits musicaux Deezer
      </p>
    </main>
  );
}
