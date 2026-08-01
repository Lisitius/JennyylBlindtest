import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { profilConnecte } from "@/lib/roles";
import {
  salonParCode,
  joueursDuSalon,
  avancerSiNecessaire,
  vuePublique,
  champsADeviner,
  repartition,
} from "@/lib/rooms";

export const dynamic = "force-dynamic";

// --- État du salon, interrogé en boucle par tous les joueurs ---
export async function GET(req, { params }) {
  const moi = await profilConnecte();
  if (!moi)
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  let salon = await salonParCode(String(params.code || "").toUpperCase());
  if (!salon)
    return NextResponse.json({ error: "Salon introuvable." }, { status: 404 });

  // C'est la lecture de l'état qui fait avancer la partie (fin de manche,
  // enchaînement automatique…).
  salon = await avancerSiNecessaire(salon);

  const estHote = salon.host_id === moi.userId;
  const revele = req.nextUrl.searchParams.get("revele") === "1";

  const joueurs = await joueursDuSalon(salon.id);
  const moiJoueur = joueurs.find((j) => j.user_id === moi.userId) || null;

  const exclu = await db(
    `/room_players?room_id=eq.${salon.id}&user_id=eq.${moi.userId}&select=kicked`
  );
  if (Array.isArray(exclu.body) && exclu.body[0]?.kicked) {
    return NextResponse.json({ error: "Tu as été exclu." }, { status: 403 });
  }

  // Présence (pour afficher qui est vraiment là)
  db(`/room_players?room_id=eq.${salon.id}&user_id=eq.${moi.userId}`, {
    method: "PATCH",
    body: JSON.stringify({ last_seen: new Date().toISOString() }),
  }).catch(() => {});

  const morceau = (salon.tracks || [])[salon.round_index] || null;
  const mode = salon.settings?.mode || "full";
  const champs = morceau ? champsADeviner(mode, morceau) : null;

  // Réponses refusées de la manche : uniquement pour l'animatrice, pour
  // qu'elle puisse en valider une à la main.
  let aArbitrer = [];
  if (estHote && salon.round_index >= 0) {
    const r = await db(
      `/room_answers?room_id=eq.${salon.id}&round_index=eq.${salon.round_index}&accepte=eq.false&select=id,pseudo,texte,user_id,created_at&order=created_at.desc&limit=15`
    );
    aArbitrer = Array.isArray(r.body) ? r.body : [];
  }

  return NextResponse.json({
    code: salon.code,
    nom: salon.settings?.nom || "Blindtest",
    statut: salon.status,
    manche: salon.round_index,
    total: (salon.tracks || []).length,
    debutManche: salon.round_started_at,
    finManche: salon.round_ends_at,
    finRevelation: salon.reveal_until,
    serveurMaintenant: new Date().toISOString(), // pour caler les horloges
    autoNext: salon.auto_next,
    verrouille: salon.locked,
    mode,
    champs,
    bareme: champs ? repartition(champs) : null,
    estHote,
    hoteJoue: salon.host_plays,
    moi: moiJoueur
      ? { pseudo: moiJoueur.pseudo, score: moiJoueur.score, trouve: moiJoueur.found || {} }
      : null,
    joueurs: joueurs.map((j) => ({
      pseudo: j.pseudo,
      score: j.score,
      estMoi: j.user_id === moi.userId,
    })),
    morceau: vuePublique(salon, morceau, { estHote, revele }),
    aArbitrer,
  });
}
