import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { profilConnecte } from "@/lib/roles";
import { salonParCode, avancerSiNecessaire, traiterReponse } from "@/lib/rooms";

export const dynamic = "force-dynamic";

// Anti-spam : une réponse toutes les 300 ms par joueur.
const dernierEnvoi = new Map();

export async function POST(req, { params }) {
  const moi = await profilConnecte();
  if (!moi)
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const cle = moi.userId;
  const maintenant = Date.now();
  if (maintenant - (dernierEnvoi.get(cle) || 0) < 300) {
    return NextResponse.json({ error: "Trop rapide." }, { status: 429 });
  }
  dernierEnvoi.set(cle, maintenant);

  let c;
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const texte = String(c.texte || "").trim();
  if (!texte) return NextResponse.json({ error: "Réponse vide." }, { status: 400 });

  let salon = await salonParCode(String(params.code || "").toUpperCase());
  if (!salon)
    return NextResponse.json({ error: "Salon introuvable." }, { status: 404 });
  salon = await avancerSiNecessaire(salon);

  const jr = await db(
    `/room_players?room_id=eq.${salon.id}&user_id=eq.${moi.userId}&select=*`
  );
  const joueur = Array.isArray(jr.body) ? jr.body[0] : null;
  if (!joueur || joueur.kicked)
    return NextResponse.json({ error: "Tu n'es pas dans ce salon." }, { status: 403 });

  const res = await traiterReponse(salon, joueur, texte);
  return NextResponse.json(res);
}
