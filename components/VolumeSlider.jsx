"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "blindtest-volume";
const DEFAULT_VOLUME = 0.85;

// Lit le volume mémorisé (0 → 1). Sûr côté serveur.
export function getStoredVolume() {
  if (typeof window === "undefined") return DEFAULT_VOLUME;
  const v = parseFloat(window.localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_VOLUME;
}

function volumeIcon(pct) {
  if (pct === 0) return "🔇";
  if (pct < 45) return "🔉";
  return "🔊";
}

// Barre de réglage du volume. `onChange` reçoit la nouvelle valeur (0 → 1)
// pour l'appliquer en direct au lecteur audio.
export default function VolumeSlider({ onChange, className = "" }) {
  const [pct, setPct] = useState(Math.round(DEFAULT_VOLUME * 100));

  // Récupère la valeur mémorisée au montage (évite tout décalage SSR).
  useEffect(() => {
    setPct(Math.round(getStoredVolume() * 100));
  }, []);

  function handle(e) {
    const next = parseInt(e.target.value, 10);
    setPct(next);
    const v = next / 100;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(v));
    }
    onChange?.(v);
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="select-none text-2xl" aria-hidden="true">
        {volumeIcon(pct)}
      </span>
      <input
        type="range"
        min="0"
        max="100"
        value={pct}
        onChange={handle}
        aria-label="Réglage du volume"
        className="volume-range w-full"
      />
      <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums text-jenny-light">
        {pct}%
      </span>
    </div>
  );
}
