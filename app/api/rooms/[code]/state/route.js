import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { profilConnecte } from "@/lib/roles";
import {
  salonParCode,
  joueursDuSalon,
  avancerSiNecessaire,
  vuePublique,
  historiquePublic,
  champsADeviner,
  repartition,
  pointsPartie,
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

  // Grade de chaque joueur, pour l'écusson affiché au classement.
  const roles = new Map();
  if (joueurs.length) {
    const ids = joueurs.map((j) => j.user_id).join(",");
    const pr = await db(`/profiles?id=in.(${ids})&select=id,role`);
    for (const p of Array.isArray(pr.body) ? pr.body : []) {
      roles.set(p.id, p.role || "joueur");
    }
  }

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

  // Ce que vaut chaque champ à cet instant précis : les points fondent avec le
  // temps, l'affichage doit le montrer (sinon rien n'incite à se dépêcher).
  const baremeMax = champs ? repartition(champs) : null;
  const ecoule = salon.round_started_at
    ? Math.max(0, (Date.now() - new Date(salon.round_started_at).getTime()) / 1000)
    : 0;
  // La décroissance suit la durée choisie (15, 20, 30 ou 45 s).
  const dureeManche =
    salon.round_started_at && salon.round_ends_at
      ? (new Date(salon.round_ends_at) - new Date(salon.round_started_at)) / 1000
      : salon.settings?.roundSeconds || 30;
  const bareme = baremeMax
    ? {
        titre: pointsPartie(ecoule, baremeMax.titre, dureeManche),
        artiste: pointsPartie(ecoule, baremeMax.artiste, dureeManche),
        film: pointsPartie(ecoule, baremeMax.film, dureeManche),
      }
    : null;

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
    fermeParHote: Boolean(salon.settings?.fermeParHote),
    mode,
    champs,
    bareme, // valeur actuelle, qui décroît
    baremeMax, // valeur de départ, pour information
    estHote,
    hoteJoue: salon.host_plays,
    moi: moiJoueur
      ? { pseudo: moiJoueur.pseudo, score: moiJoueur.score, trouve: moiJoueur.found || {} }
      : null,
    joueurs: joueurs.map((j) => ({
      pseudo: j.pseudo,
      score: j.score,
      estMoi: j.user_id === moi.userId,
      role: roles.get(j.user_id) || "joueur",
      estAnimateur: j.user_id === salon.host_id,
    })),
    morceau: vuePublique(salon, morceau, { estHote, revele }),
    // Seuls les morceaux déjà joués : rien ne fuite sur la suite de la partie.
    historique: historiquePublic(salon),
    aArbitrer,
  });
}
