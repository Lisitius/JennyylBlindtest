"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/playlists");
  }, [status, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6">
      <div className="text-center animate-fadein">
        <div className="text-8xl mb-6">🎧</div>
        <h1 className="text-6xl font-black tracking-tight">BLINDTEST</h1>
        <p className="mt-4 text-xl text-zinc-400">
          Devine les titres de tes playlists Spotify
        </p>
      </div>

      {status === "loading" ? (
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-700 border-t-spotify" />
      ) : (
        <button
          onClick={() => signIn("spotify", { callbackUrl: "/playlists" })}
          className="flex items-center gap-3 rounded-full bg-spotify px-10 py-5 text-2xl font-bold text-black transition hover:scale-105 hover:brightness-110"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8 fill-black">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.34a.75.75 0 0 1-1.03.25c-2.82-1.73-6.38-2.12-10.56-1.16a.75.75 0 1 1-.33-1.46c4.58-1.05 8.51-.6 11.67 1.34.35.21.46.67.25 1.03zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.99-8.16-2.56-11.98-1.4a.94.94 0 1 1-.55-1.8c4.37-1.33 9.8-.69 13.51 1.6.44.27.58.85.31 1.29zm.13-3.41C15.24 8.36 8.85 8.15 5.15 9.27a1.13 1.13 0 1 1-.65-2.16c4.24-1.29 11.28-1.04 15.72 1.6a1.13 1.13 0 0 1-1.12 1.95z" />
          </svg>
          Se connecter avec Spotify
        </button>
      )}

      <p className="text-sm text-zinc-600">
        Compte Spotify Premium requis pour jouer la musique
      </p>
    </main>
  );
}
