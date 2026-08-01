import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { profilConnecte } from "@/lib/roles";
import { salonParCode } from "@/lib/rooms";

export const dynamic = "force-dynamic";

// --- Quitter un salon ---
// Un joueur qui part n'interrompt la partie pour personne.
// Si c'est l'animatrice, la partie se termine pour tout le monde.
export async function POST(_req, { params }) {
  const moi = await profilConnecte();
  if (!moi)
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const salon = await salonParCode(String(params.code || "").toUpperCase());
  if (!salon) return NextResponse.json({ ok: true }); // déjà disparu

  const estHote = salon.host_id === moi.userId;

  if (estHote) {
    await db(`/rooms?id=eq.${salon.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "ended",
        settings: { ...(salon.settings || {}), fermeParHote: true },
        updated_at: new Date().toISOString(),
      }),
    });
    return NextResponse.json({ ok: true, partieFermee: true });
  }

  // Simple joueur : on note son départ. Son score reste au classement, il
  // peut revenir avec le code tant que la partie tourne.
  await db(`/room_players?room_id=eq.${salon.id}&user_id=eq.${moi.userId}`, {
    method: "PATCH",
    body: JSON.stringify({ last_seen: new Date(0).toISOString() }),
  });
  return NextResponse.json({ ok: true, partieFermee: false });
}
