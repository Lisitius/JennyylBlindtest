import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { profilConnecte } from "@/lib/roles";
import { salonParCode } from "@/lib/rooms";

export const dynamic = "force-dynamic";

// --- Rejoindre un salon avec son code ---
export async function POST(_req, { params }) {
  const moi = await profilConnecte();
  if (!moi)
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const salon = await salonParCode(String(params.code || "").toUpperCase());
  if (!salon)
    return NextResponse.json({ error: "Salon introuvable." }, { status: 404 });
  if (salon.status === "ended")
    return NextResponse.json({ error: "Cette partie est terminée." }, { status: 410 });

  const deja = await db(
    `/room_players?room_id=eq.${salon.id}&user_id=eq.${moi.userId}&select=kicked`
  );
  const present = Array.isArray(deja.body) ? deja.body[0] : null;

  if (present?.kicked)
    return NextResponse.json(
      { error: "Tu as été exclu de ce salon." },
      { status: 403 }
    );

  if (!present) {
    if (salon.locked)
      return NextResponse.json(
        { error: "Le salon est verrouillé, impossible de rejoindre." },
        { status: 403 }
      );
    const ajout = await db("/room_players", {
      method: "POST",
      body: JSON.stringify({
        room_id: salon.id,
        user_id: moi.userId,
        pseudo: moi.pseudo,
      }),
    });
    if (!ajout.ok)
      return NextResponse.json(
        { error: "Impossible de rejoindre." },
        { status: 502 }
      );
  } else {
    // Reconnexion : on met simplement à jour la présence.
    await db(`/room_players?room_id=eq.${salon.id}&user_id=eq.${moi.userId}`, {
      method: "PATCH",
      body: JSON.stringify({ last_seen: new Date().toISOString() }),
    });
  }

  return NextResponse.json({ ok: true, code: salon.code });
}
